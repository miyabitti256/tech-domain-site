/**
 * Web Animations API による Details / Summary スムーズ開閉コントローラー
 * 開くときのマージン確保も、閉じるときも完璧なイージングでアニメーションし、
 * data-state 属性により矢印アイコンの回転タイミングを開閉と完全同期します。
 */
export class DetailsAccordion {
	el: HTMLDetailsElement;
	summary: HTMLElement;
	content: HTMLElement;
	animation: Animation | null = null;
	contentAnimation: Animation | null = null;
	isClosing = false;
	isExpanding = false;

	constructor(el: HTMLDetailsElement) {
		this.el = el;
		const summary = el.querySelector("summary");
		if (!summary) {
			this.summary = el;
			this.content = el;
			return;
		}
		this.summary = summary;

		// 初期状態の data-state を設定
		el.setAttribute("data-state", el.open ? "open" : "closed");

		// summary 以外の最初の子要素、または全体ラッパーを取得
		let contentEl = el.querySelector(
			":scope > .toc-content, :scope > .details-content-wrapper",
		) as HTMLElement | null;

		if (!contentEl) {
			const otherChildren = Array.from(el.children).filter(
				(child) => child !== this.summary,
			);
			if (
				otherChildren.length === 1 &&
				otherChildren[0] instanceof HTMLElement
			) {
				contentEl = otherChildren[0];
			} else if (otherChildren.length > 0) {
				const wrapper = document.createElement("div");
				wrapper.className = "details-content-wrapper";
				for (const child of otherChildren) {
					wrapper.appendChild(child);
				}
				el.appendChild(wrapper);
				contentEl = wrapper;
			}
		}

		this.content = contentEl || (el.children[1] as HTMLElement);
		if (!this.content) return;

		this.summary.addEventListener("click", (e) => this.onClick(e));
	}

	onClick(e: MouseEvent) {
		e.preventDefault();
		this.el.style.overflow = "hidden";

		if (this.isClosing || !this.el.open) {
			this.open();
		} else if (this.isExpanding || this.el.open) {
			this.shrink();
		}
	}

	shrink() {
		this.isClosing = true;
		// 閉じ始めの瞬間に state を closed にして矢印を即座に逆回転
		this.el.setAttribute("data-state", "closed");

		const startHeight = `${this.el.offsetHeight}px`;
		const endHeight = `${this.summary.offsetHeight}px`;

		if (this.animation) this.animation.cancel();
		if (this.contentAnimation) this.contentAnimation.cancel();

		this.animation = this.el.animate(
			{
				height: [startHeight, endHeight],
			},
			{
				duration: 350,
				easing: "cubic-bezier(0.16, 1, 0.3, 1)",
			},
		);

		this.contentAnimation = this.content.animate(
			{
				opacity: [1, 0],
				transform: ["translateY(0)", "translateY(-6px)"],
			},
			{
				duration: 250,
				easing: "ease-out",
			},
		);

		this.animation.onfinish = () => this.onAnimationFinish(false);
		this.animation.oncancel = () => {
			this.isClosing = false;
		};
	}

	open() {
		this.el.style.height = `${this.el.offsetHeight}px`;
		this.el.open = true;
		// 開き始めの瞬間に state を open にして矢印を即座に回転開始
		this.el.setAttribute("data-state", "open");
		window.requestAnimationFrame(() => this.expand());
	}

	expand() {
		this.isExpanding = true;
		const startHeight = `${this.el.offsetHeight}px`;
		const endHeight = `${this.summary.offsetHeight + this.content.offsetHeight}px`;

		if (this.animation) this.animation.cancel();
		if (this.contentAnimation) this.contentAnimation.cancel();

		this.animation = this.el.animate(
			{
				height: [startHeight, endHeight],
			},
			{
				duration: 400,
				easing: "cubic-bezier(0.16, 1, 0.3, 1)",
			},
		);

		this.contentAnimation = this.content.animate(
			{
				opacity: [0, 1],
				transform: ["translateY(-8px)", "translateY(0)"],
			},
			{
				duration: 350,
				easing: "cubic-bezier(0.16, 1, 0.3, 1)",
			},
		);

		this.animation.onfinish = () => this.onAnimationFinish(true);
		this.animation.oncancel = () => {
			this.isExpanding = false;
		};
	}

	onAnimationFinish(open: boolean) {
		this.el.open = open;
		this.el.setAttribute("data-state", open ? "open" : "closed");
		this.animation = null;
		this.contentAnimation = null;
		this.isClosing = false;
		this.isExpanding = false;
		this.el.style.height = "";
		this.el.style.overflow = "";
	}
}

export function initDetailsAccordions() {
	document
		.querySelectorAll<HTMLDetailsElement>(
			"details.toc, details.custom-details, .prose details",
		)
		.forEach((el) => {
			if (el.hasAttribute("data-accordion-init")) return;
			el.setAttribute("data-accordion-init", "true");
			new DetailsAccordion(el);
		});
}
