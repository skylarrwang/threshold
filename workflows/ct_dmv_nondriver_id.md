# CT DMV Non-Driver ID Appointment Workflow

## Overview
This workflow guides filling out the CT DMV appointment scheduling form at:
https://dmv.service.ct.gov/CustomerOnlineServices/s/scheduleappointment

The form is a multi-step Salesforce flow built on Lightning Web Components. Each step has a "NEXT" button at the bottom right. The page uses custom Salesforce styling (SLDS classes), radio buttons, checkboxes, dropdowns (combobox pattern), and address autocomplete fields.

**IMPORTANT:** Wait 1-2 seconds after every click or form interaction for the page to update. This is a dynamic Salesforce form -- elements load asynchronously.

## Step 1: Getting Started
- You will see a page titled "Getting started" with the question: "Do you know your Connecticut Driver's License, Non-Driver ID, or Learner's Permit Number?"
- There are two radio button options: "Yes" and "No"
- Click the **"No"** radio button
- Click the **NEXT** button (bottom right, dark blue button with "NEXT >" text)

## Step 2: Individual Details
- You will see a page titled "Individual details" with the heading "Please enter your individual details"
- Fill in the following fields:
  - **First name***: Click the input field, then type the user's first name
  - **Last name***: Click the input field, then type the user's last name
  - **Date of Birth***: Click the input field, then type the date of birth in MM/DD/YYYY format
  - **Address***: This field has autocomplete. Click the input field with the location pin icon, then type the street address SLOWLY (letter by letter if needed). Wait 2-3 seconds for a dropdown of suggestions to appear below the field. Click the matching suggestion (e.g., "261 PARK ST, NEW HAVEN, CT 06511"). This will auto-fill the City, State, and Zip Code fields.
  - If the autocomplete dropdown does NOT appear after typing, manually fill:
    - **City***: Type the city name
    - **State***: This is a dropdown/combobox -- click it and select "CT"
    - **Zip Code***: Type the zip code
- **reCAPTCHA**: There is a "I'm not a robot" reCAPTCHA checkbox at the bottom. STOP and report this as a blocker in your summary. The user will need to solve the CAPTCHA manually via the live browser view. After the user solves it, continue.
- Click the **NEXT** button

## Step 3: Select Transaction(s) — Request Services
- You will see a page titled "Request services" with the heading "Please select the transaction(s) that you are requesting for this appointment"
- There are expandable sections. Look for **"License and non-driver ID services"** — it may already be expanded (has a collapse icon ☐), or you may need to click the chevron/arrow to expand it
- Inside the expanded section, find and click the checkbox for **"Get a new non-driver ID"**
- Click the **NEXT** button

## Step 4: Additional Information
- You will see a page titled "Additional information" with the heading "Provide the following details so we can tell you what you'll need for your appointment"
- Under "Get a new non-driver ID", there are three dropdown questions:
  1. **"Do you have a Connecticut issued driver's license or learner's permit?"** — Click the "Choose status" dropdown, then select **"No"**
  2. **"Are you a Connecticut resident?"** — Click the "Choose status" dropdown, then select **"Yes"**
  3. **"Are you a U.S. Citizen?"** — Click the "Choose status" dropdown, then select **"Yes"**
- Click the **NEXT** button

## Step 5: Compliance Status
- You will see a page titled "Compliance status" with a warning icon and the heading "Check if you have any outstanding compliance issues"
- There is a checkbox: "I have checked my compliance status and acknowledge that I will be denied services if I have any outstanding compliance issues."
- Click the **checkbox** to check it
- Click the **NEXT** button

## Step 6: Find a Branch — Search Branch Locations
- You will see a page titled "Find a branch near you" with the heading "Enter an address and we'll help you find nearby branches with available appointment times"
- In the **Address*** field (with the location pin icon), type the user's street address
- Wait for the autocomplete dropdown to appear with suggestions
- Click the matching address suggestion (e.g., "261 PARK ST, NEW HAVEN, CT 06511")
- Click the **SEARCH** button (outlined blue button with magnifying glass icon)
- Wait for DMV branch results to appear below
- Click on the **closest branch** (e.g., "Hamden") to select it
- Click the **NEXT** button

## Step 7: Select Available Timeslot
- You will see a page titled "Select available timeslot" showing a weekly calendar with available appointment times
- The calendar shows days of the week as columns, with time slots as buttons
- Click on **any available time slot** — pick the first one you see (e.g., "8:20 AM" on the first available day)
- Click the **NEXT** button

## Step 8: Required Documents
- You will see a page titled "Required documents" with information about what to bring
- There is a checkbox: "I acknowledge that I must bring the originals (physical copy) of all required documents to my appointment or my services may be denied."
- Click the **checkbox** to check it
- Click the **NEXT** button

## Step 9: Communication Preferences
- **STOP HERE.** Do not fill out the communication preferences.
- Report what you've completed so far and let the user finish from this point.
- The user can select their preferred contact method and complete the booking via the live browser view.

## Interaction Tips for This Specific Form
- **Radio buttons**: These are styled as card-like containers with text. Click anywhere on the card to select it.
- **Checkboxes**: Click directly on the checkbox element or its label text.
- **Dropdowns (comboboxes)**: These show "Choose status" as placeholder text. Click the dropdown to open it, wait for options to render, then click the desired option.
- **Address autocomplete**: Uses SmartyStreets API. Type slowly and wait for the dropdown. If suggestions don't appear, try typing more of the address or try a slightly different format.
- **NEXT button**: Always at the bottom right of each step. It's a dark blue button with white text "NEXT >".
- **Go Back**: If you make a mistake, there's a "Go Back" link at the bottom left.
- **Progress bar**: There's an orange progress bar in the left sidebar showing completion percentage.
