import * as fs from "fs-extra";
import path from "path";

const source = path.join(import.meta.dirname, "dist");
const destination = path.join(import.meta.dirname, "../backend/static");

fs.copy(source, destination);
