const puppeteer = require('puppeteer');

(async () => {
  // Launch browser
  const browser = await puppeteer.launch({ headless: false }); // Set to true to run headless
  const page = await browser.newPage();

  // 1. Navigate to the clinic website and log in
  // Go to the Appointment Booking website
  await page.goto('http://59.124.174.66:82/MobileGO.aspx?Code=3807320406');

  // sometimes there is a modal with a button to click to remove, sometimes there is not
  // We use the try...catch {} to handle the case when there is a modal
  // wait for 10s for Modal to appear, else assume it is already the page
  try {
    //The button resides in the following structure
    /**
     * <button>
     *    <span>關閉</span>
     * </button>
     */

    // We use the puppeteer xpath to select the button
    // pseudo css selector "button > span:contains(關閉)" is not a standard css selector so cannot be used
    await page.click('xpath=//button[span[text()="關閉"]]');
  } catch (error) {
    console.log(error);
    console.log('no modal detected. continuing...');
  }

  // Now we are on the page, go to 預約掛號
  const reserveButton = await page.waitForSelector('input[value="預約掛號"]');
  await reserveButton.click();
  await page.waitForNavigation();

  //Click appmt 點選預約
  // Tricky part is that there are spaces within the value
  // We need to trim the space from the value text
  // xpath=//input[normalize-space(@value) = '點選預約'] -this complex xpath doesnt work
  /**
   * <input value="  點選預約  ">
   */
  // So we take short cut to select only button with type=submit
  await page.click("xpath=//input[@type='submit']");

  // Optionally take a screenshot of the confirmation
  await page.screenshot({ path: 'booking-confirmation.png' });

  //----------------------------------

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

function isNodeList(obj) {
  return obj instanceof NodeList;
}
