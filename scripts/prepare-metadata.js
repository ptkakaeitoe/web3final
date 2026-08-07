const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..", "metadata");
const templates = path.join(root, "templates");
const output = path.join(root, "upload");
fs.mkdirSync(output, { recursive: true });

for (const file of fs.readdirSync(templates)) {
  if (!file.endsWith(".json")) continue;
  const metadata = fs.readFileSync(path.join(templates, file), "utf8");
  JSON.parse(metadata);
  fs.writeFileSync(path.join(output, file), metadata);
}

console.log(`Metadata prepared in ${output}`);
console.log("Upload these files to the GitLab repository's metadata directory.");
