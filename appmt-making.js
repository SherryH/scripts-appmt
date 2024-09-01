require('dotenv').config();
const puppeteer = require('puppeteer');
const { createWorker } = require('tesseract.js');

// NOTE: This script fails at the page of Choose doctor appmt slot
// It is unclear why it complains about the context being destroyed when navigating to that page
// And the 2nd try catch block does not catch the error
// Try to use a different library like PlayWright to continue investigation

(async () => {
  // start OCR worker
  const worker = await createWorker('eng');

  // Launch browser
  const browser = await puppeteer.launch({ devtools: true }); // Set to true to run headless
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
  // await page.click("xpath=//input[@type='submit']");
  const submitButton = await page.waitForSelector(
    'xpath=//input[@type="submit"]'
  );
  await submitButton.click();
  await page.waitForNavigation();

  //--------------------------Next Page ----------------------------
  // Fill in the form
  // Enter ID
  await page.waitForSelector('xpath=//input[@name="txtIdentityCard"]');
  await page.type(
    `xpath=//input[@name="txtIdentityCard"]`,
    `${process.env.txtIdentityCard}`
  );
  // Enter Bday
  await page.type(
    `xpath=//input[@name="txtBirthDay"]`,
    `${process.env.txtBirthDay}`
  );

  // Recognise the text on the image with OCR to pass the machine test
  const securityImg = await page.$('#captcha');
  await securityImg.screenshot({ path: 'securityImg.png' });
  const {
    data: { text },
  } = await worker.recognize('securityImg.png');
  console.log(text);
  await worker.terminate();

  //Enter the security text
  await page.type(`xpath=//input[@name="TextBox5"]`, text);

  // After adding page.waitForSelector and page.waitForNavigation in all above
  // Still getting the context destroyed execution error
  // Therefore wrapping the following in try/catch to catch the error
  try {
    await page.click('xpath=//input[@type="submit"]');
    // await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
    await page.waitForNavigation();

    //----------------- Next Page: Choose doctor appmt slot -----------------
    await page.waitForFunction('document.querySelector("#lbTele") !== null', {
      timeout: 20000,
    });
  } catch (error) {
    // when the context was destroyed, refresh the page
    // await page.reload({ waitUntil: 'networkidle0' });
    console.log('----here-----');

    try {
      // it is very strange that I kept getting this selector not found error
      // so wrapping this in try catch to avoid this error
      await page.waitForSelector('xpath=//a[text()="13診-徐維偵"]');
      await delay(3000);

      await console.log('----here2-----');
      await page.click('xpath=//a[text()="13診-徐維偵"]')[0];
      await page.waitForNavigation();
      console.log('----here3-----');
    } catch (error) {
      console.log('----here4-----');
      console.log(error);
      // the click worked! it navigated to the next page!
      // but the context gets destroyed as soon as the page is navigated
      await delay(3000);

      // await page.reload({ waitUntil: 'networkidle0' }); // calling page.reload actually destroyed context

      delay(3000);
    }
    console.log('----here5-----');
  }

  // wait for 10sec

  // Use one doctor with active link as an example
  // To complete the sign up circle
  // Then remove the appointment
  await page.click('xpath=//a[text()="13診-徐維偵"]')[0];

  // Then test whether headless mode also works

  // Key: test for the case to check polling actually gets the newly activated link

  // Optionally take a screenshot of the confirmation
  await page.screenshot({ path: 'booking-confirmation.png' });

  // Close the browser
  await browser.close();

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
  // await page.screenshot({ path: 'booking-confirmation.png' });

  // Close the browser
  await browser.close();
})();

function delay(time) {
  return new Promise((resolve) => {
    setTimeout(resolve, time);
  });
}
