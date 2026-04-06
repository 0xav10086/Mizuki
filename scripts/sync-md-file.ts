import * as readline from "readline";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import os from "os";
import fs from "fs-extra";
import { glob } from "glob";
import sharp from "sharp";
import matter from "gray-matter";
import { simpleGit } from "simple-git";
import temp from "temp";

temp.track();

const execPromise = promisify(exec);

const GITHUB_REPO_URL =
	"https://github.com/0xav10086/personal_knowledge_base.git";
const TARGET_DIR = "./src/content/posts";
const CATALOG_PATH = path.join(TARGET_DIR, "catalog.json");

let LOCAL_SOURCE_DIR = "";
const platform = os.platform();
if (platform === "linux") {
	LOCAL_SOURCE_DIR =
		"/home/av10086/Documents/SynologyDrive/personal_knowledge_base/WriterSide/Writerside/topics";
} else if (platform === "win32") {
	LOCAL_SOURCE_DIR =
		"C:\\Users\\23203\\Documents\\personal_knowledge_base\\WriterSide\\Writerside\\topics";
} else {
	console.error(`❌ 不支持的操作系统: ${platform}`);
	process.exit(1);
}

function ask(question: string): Promise<string> {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});
	return new Promise((resolve) => {
		rl.question(question, (answer) => {
			rl.close();
			resolve(answer);
		});
	});
}

async function verifyRepoAccess(repoUrl: string): Promise<boolean> {
	try {
		const { stdout } = await execPromise(`git ls-remote ${repoUrl}`);
		return stdout.length > 0;
	} catch (error: any) {
		console.error("仓库访问失败:", error.message);
		return false;
	}
}

function parseRepoUrl(repoUrl: string): { owner: string; repo: string } {
	const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+?)(\.git)?$/);
	if (!match) throw new Error("无法解析 GitHub URL");
	return { owner: match[1], repo: match[2] };
}

// 获取 catalog 中所有文件在仓库中的相对路径（相对于 sourceSubdir）
async function getFilePathsForCatalog(
	repoOwner: string,
	repoName: string,
	branch: string,
	sourceSubdir: string,
	requiredFileNames: string[],
): Promise<Map<string, string>> {
	const token = process.env.GITHUB_TOKEN;
	if (!token) throw new Error("未设置环境变量 GITHUB_TOKEN");

	const commitUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/commits/${branch}`;
	const commitRes = await fetch(commitUrl, {
		headers: {
			Authorization: `token ${token}`,
			Accept: "application/vnd.github.v3+json",
		},
	});
	if (!commitRes.ok) throw new Error(`获取 commit 失败: ${commitRes.status}`);
	const commitData = await commitRes.json();
	const commitSha = commitData.sha;

	const treeUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/git/trees/${commitSha}?recursive=1`;
	const treeRes = await fetch(treeUrl, {
		headers: {
			Authorization: `token ${token}`,
			Accept: "application/vnd.github.v3+json",
		},
	});
	if (!treeRes.ok) throw new Error(`获取 tree 失败: ${treeRes.status}`);
	const treeData = await treeRes.json();

	// 构建所有 .md 文件的路径映射（basename -> 相对路径数组）
	const allFilesMap = new Map<string, string[]>();
	for (const item of treeData.tree) {
		if (item.type !== "blob") continue;
		const fullPath = item.path;
		if (!fullPath.startsWith(sourceSubdir) || !fullPath.endsWith(".md"))
			continue;
		const basename = path.basename(fullPath);
		// 存储相对于 sourceSubdir 的路径（去掉前缀）
		const relPath = fullPath.slice(sourceSubdir.length + 1); // +1 去掉开头的斜杠
		if (!allFilesMap.has(basename)) allFilesMap.set(basename, []);
		allFilesMap.get(basename)!.push(relPath);
	}

	const resultMap = new Map<string, string>();
	for (const fileName of requiredFileNames) {
		const paths = allFilesMap.get(fileName);
		if (!paths) {
			console.error(`❌ 文件不存在: ${fileName}`);
			process.exit(1);
		}
		if (paths.length > 1) {
			console.error(`❌ 文件 ${fileName} 在仓库中存在多个副本:`);
			paths.forEach((p) => console.error(`   - ${p}`));
			console.error("请确保 catalog 中的文件名在仓库中唯一。");
			process.exit(1);
		}
		resultMap.set(fileName, paths[0]);
	}
	return resultMap;
}

// 放宽的 frontmatter 验证：可选字段如果为空字符串或空数组，则忽略
function validateFrontmatter(content: string): {
	valid: boolean;
	errors: string[];
} {
	const errors: string[] = [];
	let data: any;

	try {
		const parsed = matter(content);
		data = parsed.data;
	} catch (err: any) {
		errors.push(`Frontmatter 解析失败: ${err.message}`);
		return { valid: false, errors };
	}

	if (
		!data.title ||
		typeof data.title !== "string" ||
		data.title.trim() === ""
	) {
		errors.push("缺少必需字段 'title' 或为空");
	}
	if (!data.published) {
		errors.push("缺少必需字段 'published'");
	} else {
		const date = new Date(data.published);
		if (isNaN(date.getTime())) {
			errors.push("字段 'published' 不是有效的日期格式");
		}
	}

	const optionalFields: Record<string, (v: any) => boolean> = {
		description: (v) => typeof v === "string" && v.trim() !== "",
		image: (v) => typeof v === "string" && v.trim() !== "",
		tags: (v) =>
			Array.isArray(v) &&
			v.length > 0 &&
			v.every((t: any) => typeof t === "string" && t.trim() !== ""),
		category: (v) => typeof v === "string" && v.trim() !== "",
		draft: (v) => typeof v === "boolean",
		pinned: (v) => typeof v === "boolean",
		comment: (v) => typeof v === "boolean",
		lang: (v) => typeof v === "string" && /^[a-z]{2}(-[A-Z]{2})?$/.test(v),
	};

	for (const [field, validator] of Object.entries(optionalFields)) {
		if (data.hasOwnProperty(field)) {
			const value = data[field];
			const isEmpty =
				value === "" ||
				(Array.isArray(value) && value.length === 0) ||
				value == null;
			if (!isEmpty && !validator(value)) {
				errors.push(`字段 '${field}' 存在但无效（非空值格式不正确）`);
			}
		}
	}

	return { valid: errors.length === 0, errors };
}

async function processImages(
	content: string,
	sourceDir: string,
	targetResourceDir: string,
): Promise<{ content: string; processedImages: Map<string, string> }> {
	const obsidianImgRegex = /!\[\[(.+?\.(?:png|jpg|jpeg|webp|gif))\]\]/gi;
	const matches = [...content.matchAll(obsidianImgRegex)];
	if (matches.length === 0) return { content, processedImages: new Map() };

	await fs.ensureDir(targetResourceDir);
	const processedImages = new Map<string, string>();
	const usedNames = new Set<string>();

	for (const match of matches) {
		const originalImgName = match[1];
		const srcImgPath = path.join(sourceDir, "Resource", originalImgName);

		if (!(await fs.pathExists(srcImgPath))) {
			console.warn(`   ⚠️ 找不到图片: ${originalImgName}`);
			continue;
		}

		let baseName = "";
		const dateMatch = originalImgName.match(
			/(20\d{2})[-_ ]?(\d{2})[-_ ]?(\d{2})[-_ ]?(\d{2})[:_ ]?(\d{2})[:_ ]?(\d{2})/,
		);
		if (dateMatch) {
			baseName = dateMatch.slice(1, 7).join("");
		} else {
			const stats = await fs.stat(srcImgPath);
			const date =
				stats.birthtime.getTime() === 0 ? stats.mtime : stats.birthtime;
			const year = date.getFullYear();
			const month = String(date.getMonth() + 1).padStart(2, "0");
			const day = String(date.getDate()).padStart(2, "0");
			const hour = String(date.getHours()).padStart(2, "0");
			const minute = String(date.getMinutes()).padStart(2, "0");
			const second = String(date.getSeconds()).padStart(2, "0");
			baseName = `${year}${month}${day}${hour}${minute}${second}`;
		}

		let finalName = `${baseName}.webp`;
		let counter = 1;
		while (usedNames.has(finalName)) {
			finalName = `${baseName}${counter}.webp`;
			counter++;
		}
		usedNames.add(finalName);
		processedImages.set(originalImgName, finalName);

		const destImgPath = path.join(targetResourceDir, finalName);
		await sharp(srcImgPath).webp({ quality: 80 }).toFile(destImgPath);
		console.log(`   🖼️ 转换图片: ${originalImgName} -> ${finalName}`);
	}

	const newContent = content.replace(obsidianImgRegex, (match, imgName) => {
		const newName = processedImages.get(imgName);
		if (newName) return `![w-50%](./Resource/${newName})`;
		const webpName = imgName.replace(/\.[^.]+$/, ".webp");
		return `![w-50%](./Resource/${webpName})`;
	});

	return { content: newContent, processedImages };
}

// Wiki 链接处理函数
function processWikiLinks(
	content: string,
	catalogFileNames: Set<string>,
): string {
	// 匹配 [[...]]，排除图片 ![[...]]
	const wikiLinkRegex = /(?<!!)\[\[([^\]]+)\]\]/g;
	return content.replace(wikiLinkRegex, (match, linkText) => {
		// 分离文件名和显示文字（支持 [[文件名|显示文字]]）
		let [fileName, displayText] = linkText.split("|");
		fileName = fileName.trim();
		if (!fileName.endsWith(".md")) fileName += ".md";

		if (catalogFileNames.has(fileName)) {
			const slug = fileName.replace(/\.md$/, "");
			const encodedSlug = encodeURIComponent(slug);
			const url = `/posts/${encodedSlug}/`;
			const finalDisplay = displayText ? displayText.trim() : slug;
			// 关键：不要有任何多余空格或换行
			return `[${finalDisplay}](${url})`;
		} else {
			// 文件不存在，保留原文本（去掉双方括号）
			return linkText;
		}
	});
}

async function syncFromSource(
	sourceRoot: string, // topics 目录的路径
	filePathMap: Map<string, string>, // 文件名 -> 相对路径（相对于 topics 目录）
	catalogFileNames: Set<string>,
	targetDir: string,
): Promise<void> {
	console.log(`\n📝 开始从 ${sourceRoot} 同步文件...`);

	for (const [fileName, relPath] of filePathMap.entries()) {
		const sourceFilePath = path.join(sourceRoot, relPath);
		if (!(await fs.pathExists(sourceFilePath))) {
			console.warn(`⚠️ 源文件不存在: ${fileName} (路径: ${relPath})`);
			continue;
		}

		console.log(`📄 处理文件: ${fileName}`);
		let content = await fs.readFile(sourceFilePath, "utf-8");

		const { valid, errors } = validateFrontmatter(content);
		if (!valid) {
			console.error(`❌ 文件 ${fileName} frontmatter 不合法，跳过处理:`);
			errors.forEach((err) => console.error(`   - ${err}`));
			continue;
		}
		console.log(`   ✅ Frontmatter 合法`);

		const sourceFileDir = path.dirname(sourceFilePath);
		const targetResourceDir = path.join(targetDir, "Resource");
		const { content: contentAfterImages } = await processImages(
			content,
			sourceFileDir,
			targetResourceDir,
		);
		content = contentAfterImages;

		content = processWikiLinks(content, catalogFileNames);

		const targetFilePath = path.join(targetDir, fileName);
		await fs.ensureDir(path.dirname(targetFilePath));
		await fs.writeFile(targetFilePath, content, "utf-8");
		console.log(`   ✅ 已写入: ${targetFilePath}`);
	}

	console.log("\n✅ 同步完成！");
}

async function syncFromGitHub() {
	console.log("🚀 从 GitHub 同步文档...");

	const hasAccess = await verifyRepoAccess(GITHUB_REPO_URL);
	if (!hasAccess) {
		console.error("❌ 无权限访问 GitHub 仓库");
		process.exit(1);
	}

	const { owner, repo } = parseRepoUrl(GITHUB_REPO_URL);
	const branch = "main";
	const sourceSubdir = "WriterSide/Writerside/topics";

	if (!(await fs.pathExists(CATALOG_PATH))) {
		console.error(`❌ 找不到 Catalog 文件: ${CATALOG_PATH}`);
		process.exit(1);
	}
	const catalog = await fs.readJson(CATALOG_PATH);
	const sites = catalog.sites || [];
	const requiredFileNames = sites.map((site: any) => {
		let name = site.name;
		if (!name.endsWith(".md")) name += ".md";
		return name;
	});

	// 获取每个文件在 topics 目录下的相对路径（同时验证唯一性）
	let filePathMap: Map<string, string>;
	try {
		filePathMap = await getFilePathsForCatalog(
			owner,
			repo,
			branch,
			sourceSubdir,
			requiredFileNames,
		);
	} catch (err: any) {
		console.error("❌ 获取文件路径失败:", err.message);
		process.exit(1);
	}

	// 克隆仓库到临时目录（浅克隆，只拉取最新代码）
	const tempDir = temp.mkdirSync("obsidian-sync");
	console.log(`📦 克隆仓库到临时目录: ${tempDir}`);
	const git = simpleGit();
	await git.clone(GITHUB_REPO_URL, tempDir, ["--depth", "1"]);

	const sourceDir = path.join(tempDir, sourceSubdir);
	if (!(await fs.pathExists(sourceDir))) {
		console.error(`❌ 临时目录中找不到源目录: ${sourceDir}`);
		process.exit(1);
	}

	const catalogFileNames = new Set(requiredFileNames);
	await syncFromSource(sourceDir, filePathMap, catalogFileNames, TARGET_DIR);

	console.log("🧹 清理临时目录...");
	temp.cleanupSync();
}

async function syncFromLocal() {
	console.log("🚀 从本地同步文档...");
	if (!(await fs.pathExists(LOCAL_SOURCE_DIR))) {
		console.error(`❌ 本地源目录不存在: ${LOCAL_SOURCE_DIR}`);
		process.exit(1);
	}

	if (!(await fs.pathExists(CATALOG_PATH))) {
		console.error(`❌ 找不到 Catalog 文件: ${CATALOG_PATH}`);
		process.exit(1);
	}
	const catalog = await fs.readJson(CATALOG_PATH);
	const sites = catalog.sites || [];
	const requiredFileNames = sites.map((site: any) => {
		let name = site.name;
		if (!name.endsWith(".md")) name += ".md";
		return name;
	});

	// 本地同步：使用 glob 查找每个文件的实际路径（相对于 LOCAL_SOURCE_DIR）
	const filePathMap = new Map<string, string>();
	for (const fileName of requiredFileNames) {
		const found = await glob(`**/${fileName}`, {
			cwd: LOCAL_SOURCE_DIR,
			absolute: false,
		});
		if (found.length === 0) {
			console.error(`❌ 本地文件不存在: ${fileName}`);
			process.exit(1);
		}
		if (found.length > 1) {
			console.error(`❌ 本地文件 ${fileName} 存在多个副本:`);
			found.forEach((p) => console.error(`   - ${p}`));
			process.exit(1);
		}
		filePathMap.set(fileName, found[0]);
	}

	const catalogFileNames = new Set(requiredFileNames);
	await syncFromSource(
		LOCAL_SOURCE_DIR,
		filePathMap,
		catalogFileNames,
		TARGET_DIR,
	);
}

async function main() {
	const choice = await ask(
		"请输入文档获取方式（1=从github获取；2=从本地获取）: ",
	);
	if (choice === "1") {
		await syncFromGitHub();
	} else if (choice === "2") {
		await syncFromLocal();
	} else {
		console.error("无效输入，请输入 1 或 2");
		process.exit(1);
	}
}

main().catch(console.error);
