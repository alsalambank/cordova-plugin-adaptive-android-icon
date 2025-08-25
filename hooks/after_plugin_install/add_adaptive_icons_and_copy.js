#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');

const parser = new xml2js.Parser();
const builder = new xml2js.Builder();

const densities = ['mdpi','hdpi','xhdpi','xxhdpi','xxxhdpi'];

module.exports = function (ctx) {
    const projectRoot = ctx.opts.projectRoot;
    const pluginRoot  = path.join(ctx.opts.plugin.dir);

    const configPath = path.join(projectRoot, "config.xml");
    const appIconFolder = "hummingbird";

    console.log("APP_ICON_FOLDER from config.xml:", appIconFolder);

    if (!appIconFolder) {
        console.warn("⚠️ No APP_ICON_FOLDER preference found in config.xml or plugin.xml");
        return;
    }

    console.log("📂 Using APP_ICON_FOLDER:", appIconFolder);
    
    const pluginResPath = `${pluginRoot}/res/icons/${appIconFolder}`;

    fs.readFile(configPath, (err, data) => {
        if (err) throw err;

        parser.parseString(data, (err, result) => {
            if (err) throw err;

            let platform = result.widget.platform?.find(p => p.$.name === 'android');
            if (!platform) {
                // Create platform node if missing
                platform = { $: { name: 'android' }, icon: [] };
                result.widget.platform = result.widget.platform || [];
                result.widget.platform.push(platform);
            }

            // Remove existing adaptive-icon entries
            platform.icon = [];

            densities.forEach(density => {
                const foreground  = `${pluginResPath}/mipmap-${density}/ic_launcher_foreground.png`;
                const background  = `@color/ic_launcher_background`;
                const monochrome  = `${pluginResPath}/mipmap-${density}/ic_launcher_monochrome.png`;
                const defaultIcon = `${pluginResPath}/mipmap-${density}/ic_launcher.png`;

                // Add entry to config.xml
                platform.icon.push({
                    $: { foreground, background, monochrome, density }
                });

                // Copy to platforms/android
                const targetDir = path.join(projectRoot, `platforms/android/app/src/main/res/mipmap-${density}`);
                if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

                fs.copyFileSync(foreground, `${targetDir}/ic_launcher_foreground.png`);
                fs.copyFileSync(monochrome, `${targetDir}/ic_launcher_monochrome.png`);
                fs.copyFileSync(defaultIcon, `${targetDir}/ic_launcher.png`);
            });

            const xml = builder.buildObject(result);
            fs.writeFile(configPath, xml, err => {
                if (err) throw err;
                console.log('Adaptive icons updated in config.xml and copied to platforms successfully!');
            });
        });
    });
};