const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('PAGE:', msg.text()));
    
    const filePath = `file:///${path.resolve('index.html').replace(/\\/g, '/')}`;
    await page.goto(filePath, { waitUntil: 'domcontentloaded' });
    
    // Set up state
    await page.evaluate(() => {
        localStorage.setItem('church_unit_code', 'test-zone');
    });
    await page.goto(filePath, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 1000));
    
    // Create a recurring event
    console.log("=== Creating Recurring Event ===");
    await page.evaluate(() => {
        window.isFirebaseConfigured = false;
        document.getElementById('eventId').value = ""; // new event
        document.getElementById('eventTitle').value = "Test Series";
        document.getElementById('eventDate').value = "2026-05-10";
        document.getElementById('eventTime').value = "10:00";
        document.getElementById('eventLocation').value = "Capilla";
        document.getElementById('eventDesc').value = "Desc";
        document.getElementById('eventType').value = "general";
        document.getElementById('eventRequireRsvp').checked = false;
        document.getElementById('eventRecurring').checked = true;
        
        // Mock prompt to avoid blocking
        window.prompt = () => "2"; // 2 = whole series
        window.confirm = () => true;
        
        const form = document.getElementById('eventForm');
        form.dispatchEvent(new Event('submit'));
    });
    await new Promise(r => setTimeout(r, 500));
    
    // Check how many events
    let counts = await page.evaluate(() => {
        return {
            totalEvents: state.events.length,
            groupMatches: state.events.filter(e => e.recurringGroupId && e.title === 'Test Series').length
        };
    });
    console.log("After create:", counts);
    
    // Edit the whole series
    console.log("=== Editing Whole Series ===");
    await page.evaluate(() => {
        // Pick the first one to edit
        const first = state.events[0];
        document.getElementById('eventId').value = first.id;
        document.getElementById('eventTitle').value = "Test Series Edited";
        
        const form = document.getElementById('eventForm');
        form.dispatchEvent(new Event('submit'));
    });
    await new Promise(r => setTimeout(r, 500));
    
    counts = await page.evaluate(() => {
        return {
            totalEvents: state.events.length,
            editedMatches: state.events.filter(e => e.title === 'Test Series Edited').length
        };
    });
    console.log("After edit:", counts);
    
    // Delete the whole series
    console.log("=== Deleting Whole Series ===");
    await page.evaluate(() => {
        const first = state.events[0];
        document.getElementById('eventId').value = first.id;
        window.deleteEvent();
    });
    await new Promise(r => setTimeout(r, 500));
    
    counts = await page.evaluate(() => {
        return {
            totalEvents: state.events.length
        };
    });
    console.log("After delete:", counts);
    
    await browser.close();
})();
