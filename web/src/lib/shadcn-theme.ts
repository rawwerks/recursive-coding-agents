export type CssVars = Record<string, string | number>;

export interface ShadcnRegistryTheme {
	$schema?: string;
	name: string;
	title?: string;
	description?: string;
	type?: string;
	css?: Record<string, unknown>;
	cssVars: {
		theme?: CssVars;
		light?: CssVars;
		dark?: CssVars;
	};
}

const CSS_VAR_NAME = /^[a-zA-Z0-9-]+$/;
const CSS_SELECTOR = /^[.#:a-zA-Z0-9_[\]="':\s>+~,*()-]+$/;

function cleanValue(value: string | number): string | null {
	const text = String(value).trim();
	if (!text || /[{};<>]/.test(text) || /<\/style/i.test(text)) return null;
	return text;
}

function declarations(vars: CssVars | undefined): string {
	if (!vars) return '';

	return Object.entries(vars)
		.flatMap(([name, value]) => {
			if (!CSS_VAR_NAME.test(name)) return [];
			const clean = cleanValue(value);
			return clean ? [`\t--${name}: ${clean};`] : [];
		})
		.join('\n');
}

function block(selector: string, vars: CssVars | undefined): string {
	const body = declarations(vars);
	return body ? `${selector} {\n${body}\n}` : '';
}

function cssObjectToRules(css: Record<string, unknown> | undefined): string {
	if (!css) return '';

	return Object.entries(css)
		.flatMap(([selector, value]) => {
			if (!CSS_SELECTOR.test(selector) && !selector.startsWith('@')) return [];

			if (selector.startsWith('@') && value && typeof value === 'object' && !Array.isArray(value)) {
				const inner = cssObjectToRules(value as Record<string, unknown>);
				return inner ? [`${selector} {\n${inner}\n}`] : [];
			}

			if (value && typeof value === 'object' && !Array.isArray(value)) {
				const body = declarations(value as CssVars);
				return body ? [`${selector} {\n${body}\n}`] : [];
			}

			return [];
		})
		.join('\n\n');
}

export function shadcnThemeCss(theme: ShadcnRegistryTheme): string {
	const rootVars = {
		...(theme.cssVars.theme ?? {}),
		...(theme.cssVars.light ?? {})
	};
	const darkVars = theme.cssVars.dark ?? {};

	return [
		'/* Generated from src/lib/themes/active.ts. */',
		block(':root:root', rootVars),
		block(':root.dark, .dark.dark', darkVars),
		cssObjectToRules(theme.css)
	]
		.filter(Boolean)
		.join('\n\n');
}

export function shadcnThemeStyleTag(theme: ShadcnRegistryTheme): string {
	const css = shadcnThemeCss(theme).replace(/<\/style/gi, '<\\/style');
	return `<style id="active-shadcn-theme">${css}</style>`;
}
