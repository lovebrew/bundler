const apiBase = require("../package.json").apiBase;
export const API_URL = apiBase[process.env.NODE_ENV ?? "development"];
