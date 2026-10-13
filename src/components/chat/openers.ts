/**
 * The ways into the chat offered on the home page. `message` is what the customer is taken to have
 * said first; the one without a message opens the chat and lets them type.
 */
export const CHAT_OPENERS = [
  { id: "game", title: "Game UI", hint: "HUDs, menus, inventories, full interface systems", message: "A game UI" },
  { id: "web", title: "Website / app UI", hint: "Landing pages, dashboards, product interfaces", message: "A website or app UI" },
  { id: "import", title: "Asset import & setup", hint: "Get finished art working properly in your engine", message: "Importing finished UI art into my engine" },
  { id: "polish", title: "Polish & motion", hint: "Make an existing interface feel better to use", message: "Polish and motion for an existing interface" },
  { id: "other", title: "Something else", hint: "Tell the assistant in your own words", message: "" },
] as const;

/** The first message for an opener id, or null when the id is unknown or has none. */
export const openerMessage = (id: string | null) => CHAT_OPENERS.find((opener) => opener.id === id)?.message || null;
