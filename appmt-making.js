const puppeteer = require('puppeteer');

(async () => {
  // Launch browser
  const browser = await puppeteer.launch({ headless: false }); // Set to true to run headless
  const page = await browser.newPage();

  // 1. Navigate to the clinic website and log in
  // Go to the Appointment Booking website
  await page.goto('http://59.124.174.66:82/MobileGO.aspx?Code=3807320406');
  await page.type('#login-email', 'johndoe@example.com');
  await page.type('#login-password', 'securepassword123');
  await page.click('#login-submit');
  await page.waitForNavigation();

  // 2. Navigate to the booking page
  await page.goto('https://www.abc.com/booking');

  // 3. Polling loop to check for available slots
  let slotFound = false;
  while (!slotFound) {
    // Get all slot elements (adjust selector as needed)
    const slots = await page.$$('.slot'); // '.slot' should be a class for booking slots

    for (let slot of slots) {
      // Check if the slot is available (adjust condition as needed)
      const isAvailable = await slot.evaluate(
        (node) => !node.classList.contains('disabled')
      );

      if (isAvailable) {
        // Click the available slot
        await slot.click();
        slotFound = true;
        break;
      }
    }

    if (!slotFound) {
      // Wait for 5 seconds before checking again
      await page.waitForTimeout(5000);
      await page.reload(); // Reload the page to refresh slot status
    }
  }

  // 4. Confirm the appointment
  await page.click('#book-appointment'); // Click on the confirm button

  // 5. Wait for confirmation and capture it
  await page.waitForSelector('#confirmation-message');
  const confirmationMessage = await page.$eval(
    '#confirmation-message',
    (el) => el.textContent
  );
  console.log('Booking Confirmed:', confirmationMessage);

  // Optionally take a screenshot of the confirmation
  await page.screenshot({ path: 'booking-confirmation.png' });

  // Close the browser
  await browser.close();
})();
