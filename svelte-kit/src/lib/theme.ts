import config from './config.json';

export const thumbnailSize = config.thumbnailSize;
export const cartThumbnailSize = config.cartThumbnailSize;

function block(selector: string, values: Record<string, string>) {
	const body = Object.entries(values)
		.map(([key, value]) => `${key}: ${value};`)
		.join(' ');
	return `${selector} { ${body} }`;
}

/** CSS custom properties for the light and dark theme plus the alert colours. */
export function themeCss() {
	const alerts = Object.entries(config.colors.alerts)
		.map(([name, value]) => `--alert-${name}: ${value};`)
		.join(' ');
	return [
		block(':root', config.colors.light),
		block('body[data-theme="dark"]', config.colors.dark),
		`:root { ${alerts} }`
	].join('\n');
}
