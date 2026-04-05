import fs from "fs-extra";
import path from "path";
import { glob } from "glob";
import os from "os";
import sharp from "sharp";

// --- 环境检测 ---
const platform = os.platform();
let SOURCE_DIR = "";
let TARGET_DIR = "./src/content/posts";

if (platform === "linux") {
	SOURCE_DIR =
		"/home/av10086/Documents/SynologyDrive/personal_knowledge_base/WriterSide/Writerside/topics";
	console.log("当前的环境为 linux ");
} else if (platform === "win32") {
	SOURCE_DIR =
		"C:\\Users\\23203\\Documents\\personal_knowledge_base\\WriterSide\\Writerside\\topics";
	console.log("当前的环境为 Windows ");
} else {
	console.error(`❌ 不支持的操作系统: ${platform}`);
	process.exit(1);
}

async function syncDocs() {
	console.log("🚀 开始环境检测与同步...");

	const catalogPath = path.join(TARGET_DIR, "catalog.json");
	if (!(await fs.pathExists(catalogPath))) {
		console.error(`❌ 找不到 Catalog 文件: ${catalogPath}`);
		process.exit(1);
	}
	const catalog = await fs.readJson(catalogPath);
	const sites = catalog.sites || [];

	for (const site of sites) {
		let file = site.name;
		if (!file.endsWith(".md")) {
			file += ".md";
		}

		// 使用 glob 递归查找文件 (返回绝对路径)
		const foundFiles = await glob(`**/${file}`, { cwd: SOURCE_DIR, absolute: true });
		const sourceFilePath = foundFiles[0];
		const targetFilePath = path.join(TARGET_DIR, file);

		if (sourceFilePath && await fs.pathExists(sourceFilePath)) {
			console.log(`📝 正在同步: ${file}`);
			let content = await fs.readFile(sourceFilePath, "utf-8");

			// 匹配 Obsidian 图片语法 ![[image.png]] 或 ![[image.jpg]] 等
			const obsidianImgRegex =
				/!\[\[(.+?\.(?:png|jpg|jpeg|webp|gif))\]\]/gi;
			const matches = [...content.matchAll(obsidianImgRegex)];

			if (matches.length > 0) {
				const targetResourceDir = path.join(
					path.dirname(targetFilePath),
					"Resource",
				);
				await fs.ensureDir(targetResourceDir);

				const processedImages = new Map<string, string>();
				const usedNames = new Set<string>();

				for (const match of matches) {
					// 动态定位资源目录：假设 Resource 在该 Markdown 文件的同级目录下
					const sourceResourceDir = path.join(
						path.dirname(sourceFilePath),
						"Resource",
					);
					const originalImgName = match[1];
					const srcImgPath = path.join(
						sourceResourceDir,
						originalImgName,
					);

					if (await fs.pathExists(srcImgPath)) {
						let baseName = "";

						// 1. 优先尝试从文件名提取时间 (例如 QQ20260129-012215.png 或 Pasted image 2026...)
						const dateMatch = originalImgName.match(
							/(20\d{2})[-_ ]?(\d{2})[-_ ]?(\d{2})[-_ ]?(\d{2})[:_ ]?(\d{2})[:_ ]?(\d{2})/,
						);

						if (dateMatch) {
							baseName = dateMatch.slice(1, 7).join("");
						} else {
							// 2. 回退到文件系统时间
							const stats = await fs.stat(srcImgPath);
							const date =
								stats.birthtime.getTime() === 0
									? stats.mtime
									: stats.birthtime;
							const year = date.getFullYear();
							const month = String(date.getMonth() + 1).padStart(
								2,
								"0",
							);
							const day = String(date.getDate()).padStart(2, "0");
							const hour = String(date.getHours()).padStart(
								2,
								"0",
							);
							const minute = String(date.getMinutes()).padStart(
								2,
								"0",
							);
							const second = String(date.getSeconds()).padStart(
								2,
								"0",
							);
							baseName = `${year}${month}${day}${hour}${minute}${second}`;
						}

						let finalName = `${baseName}.webp`;
						let counter = 1;

						// 防止同一秒内的文件重名
						while (usedNames.has(finalName)) {
							finalName = `${baseName}${counter}.webp`;
							counter++;
						}
						usedNames.add(finalName);
						processedImages.set(originalImgName, finalName);

						const destImgPath = path.join(
							targetResourceDir,
							finalName,
						);

						// 使用 sharp 进行格式转换
						await sharp(srcImgPath)
							.webp({ quality: 80 }) // 设置 WebP 质量
							.toFile(destImgPath);
						console.log(
							`   🖼️  已转换并重命名: ${originalImgName} -> ${finalName}`,
						);
					} else {
						console.warn(`   ⚠️  找不到图片源: ${originalImgName}`);
					}
				}

				// 修改 MD 内容：替换链接并指向 .webp
				content = content.replace(
					obsidianImgRegex,
					(match, imgName) => {
						const newName = processedImages.get(imgName);
						if (newName) {
							// ✅ 返回正确的格式：![样式名](路径)
							return `![w-50%](./Resource/${newName})`;
						}

						// 降级处理：如果找不到重命名后的文件，至少要把后缀改了
						const webpName = imgName.replace(/\.[^.]+$/, ".webp");
						return `![w-50%](./Resource/${webpName})`;
					},
				);
			}

			await fs.writeFile(targetFilePath, content, "utf-8");
		} else {
			console.warn(`⚠️  源文件不存在: ${file}`);
		}
	}
	console.log("✅ 同步与 WebP 转换完成！");
}

syncDocs().catch(console.error);
