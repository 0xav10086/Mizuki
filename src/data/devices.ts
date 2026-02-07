// 设备数据配置文件

export interface Device {
	name: string;
	image: string;
	specs: string;
	description: string;
	link: string;
}

// 设备类别类型，支持品牌和自定义类别
export type DeviceCategory = {
	[categoryName: string]: Device[];
} & {
	自定义?: Device[];
};

export const devicesData: DeviceCategory = {
	OnePlus: [
		{
			name: "OnePlus Ace 5 Pro",
			image: "/images/device/ace-5-pro.png",
			specs: "Gray / 16G + 256GB",
			description: "一加 Ace 5 Pro\n" + "性能凶猛 快人一代",
			link: "https://www.oneplus.com/cn/ace-5-pro",
		},
	],
	Router: [
		{
			name: "Xiaomi-BE3600",
			image: "/images/device/be3600.png",
			specs: "1000Mbps / 1000Mbps",
			description:
				"新一代 WiFi7，疾速超乎现象",
			link: "https://www.mi.com/shop/buy/detail?product_id=19845&cfrom=search",
		},
	],
};
