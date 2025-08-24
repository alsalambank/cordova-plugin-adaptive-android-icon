#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

module.exports = function (context) {
    if (!context.opts.plugin || !context.opts.plugin.pluginInfo) {
        return;
    }

    // Read plugin variables
    const pluginVars = context.opts.plugin.pluginInfo.getPreferences();
    console.log("Plugin variables:", pluginVars);

    // Save them to a JSON file in project root
    const filePath = path.join(context.opts.projectRoot, "plugin-variables.json");
    fs.writeFileSync(filePath, JSON.stringify(pluginVars, null, 2));
    console.log("Saved plugin variables to", filePath);
};