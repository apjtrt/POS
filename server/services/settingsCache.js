const prisma = require('../config/db');

let cachedSettings = null;

const getSettings = async () => {
    if (!cachedSettings) {
        cachedSettings = await prisma.settings.findFirst();
    }
    return cachedSettings;
};

const clearSettingsCache = () => {
    cachedSettings = null;
};

module.exports = { getSettings, clearSettingsCache };
