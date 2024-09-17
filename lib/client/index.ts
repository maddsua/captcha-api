
declare let window: Window & {
    grecaptcha?: {
		ready(callback: () => void): void;
		execute(siteKey: string, action: { action: string }): Promise<string>;
	}
};

interface LoadOptions {

	/* "render" is the same option as "siteKey" */
	render: string;

	/* on:load callback function name (needs to be in global scope) */
	onload?: string;
}

const loadedContexts = new Set<string>();

/**
 * Load recaptcha script
 */
export const loadReCaptcha = (options: LoadOptions) => {

	if (loadedContexts.has(options.render)) {

		if (window.grecaptcha) {
			console.warn(`reCAPTCHA key "${options.render.slice(0, 8)}..." already loaded 👍`)
		} else {
			console.warn(`reCAPTCHA key "${options.render.slice(0, 8)}..." is still loading...`)
		}

		return false;
	}

	loadedContexts.add(options.render);

	const recaptchaEndpoint = 'https://www.google.com/recaptcha/api.js'
	const scriptURL = new URL(recaptchaEndpoint);

	for (let key in options) {
		scriptURL.searchParams.set(key, options[key as keyof LoadOptions] as string);
	};

	const recaptchaScript = document.createElement('script');
		recaptchaScript.src = scriptURL.href;
		recaptchaScript.async = true;
	document.head.appendChild(recaptchaScript);

	return true;
};

interface ExecuteV3Options {
	action?: string;
	maxLoadingWaitTimeS?: number;
}

/**
 * Execute invisible v3 challenge
 */
export const executeReCaptchaV3 = (siteKey: string, options?: ExecuteV3Options) =>
	new Promise<string>(async (resolve, reject) => {

	const waitForReadyS = options?.maxLoadingWaitTimeS || 5;
	const retryTimeout = 1000;
	const rejectAfterNotLoadedAt = new Date().getTime() + waitForReadyS * 1000;

	if (!window.grecaptcha?.ready || !loadedContexts.has(siteKey)) {
		loadReCaptcha({ render: siteKey });
	}

	while (!window.grecaptcha?.ready && new Date().getTime() < rejectAfterNotLoadedAt) {
		console.warn('Waiting for recaptcha...');
		await new Promise<void>(resolve => setTimeout(resolve, retryTimeout));
	}

	if (!window.grecaptcha?.ready) {
		reject('Failed to load recaptcha script');
		return;
	}

	const executeCallback = () => window.grecaptcha!.execute(siteKey, {
		action: options?.action || 'submit'
	}).then(resolve).catch(reject);

	window.grecaptcha.ready(executeCallback);
});
