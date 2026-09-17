import type { AnnouncementConfig } from "../types/announcementConfig";

export const announcementConfig: AnnouncementConfig = {
	// 公告标题，留空则走i18n默认标题
	title: "AI 维护声明",

	// 公告内容
	content: "本博客内容完全由 AI 维护，仅作为个人笔记，请勿作为权威参考。",

	// 是否允许用户关闭公告
	closable: true,

	link: {
		// 启用链接
		enable: true,
		// 链接文本
		text: "了解本站",
		// 链接 URL
		url: "/about/",
		// 内部链接
		external: false,
	},
};
