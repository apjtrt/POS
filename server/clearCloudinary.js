require('dotenv').config();
const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

async function deepClean() {
    console.log('Connecting to Cloudinary...');

    const foldersToEmpty = [
        'login-images',
        'releases',
        'expense-bills',
        'database_backups',
        'pdfs',
        'samples/animals',
        'samples/ecommerce',
        'samples/food',
        'samples/landscapes',
        'samples/people',
        'samples'
    ];

    for (const folder of foldersToEmpty) {
        try {
            console.log(`Clearing files in ${folder}...`);
            await cloudinary.api.delete_resources_by_prefix(`${folder}/`);
            // Also try raw just in case
            await cloudinary.api.delete_resources_by_prefix(`${folder}/`, { resource_type: 'raw' });
        } catch (e) {
            console.log(`  Skipped files in ${folder}`);
        }
    }

    // Now delete the empty folders (must be done after emptying)
    // Delete subfolders first
    for (const folder of foldersToEmpty) {
        try {
            console.log(`Deleting folder ${folder}...`);
            await cloudinary.api.delete_folder(folder);
        } catch (e) {
            console.log(`  Could not delete folder ${folder}:`, e.message);
        }
    }

    console.log('✅ Deep clean completed! Folders and files removed.');
}

deepClean();
