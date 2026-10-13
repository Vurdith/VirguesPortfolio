/** The assistant only exists when an OpenRouter key is configured. */
export const chatEnabled = () => Boolean(process.env.OPENROUTER_API_KEY);
