const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

walkDir('d:/donation-receipt-system/client/src', function(filePath) {
    if (filePath.endsWith('.jsx')) {
        let content = fs.readFileSync(filePath, 'utf8');
        let originalContent = content;
        
        // Replace glass-card and animations
        content = content.replace(/glass-card animate-lift/g, 'saas-card hover:shadow-md transition-shadow');
        content = content.replace(/glass-card/g, 'saas-card');
        
        // Remove glass backgrounds and backgrounds entirely
        content = content.replace(/bg-black\/5 dark:bg-white\/5/g, 'bg-slate-50 dark:bg-slate-900/50');
        
        // Revert glass back to standard header/sidebar
        content = content.replace(/glass border-r-0/g, 'bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700');
        content = content.replace(/glass border-b-0 border-l border-white\/20 dark:border-slate-700\/50/g, 'bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700');

        if (content !== originalContent) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log('Updated', filePath);
        }
    }
});
