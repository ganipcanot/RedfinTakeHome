// Require section
require('isomorphic-fetch');
const readline = require('readline')

// Consts
const url = 'http://data.sfgov.org/resource/bbb8-hzi6.json';
const colBuffer = 4;
const firstColName = 'NAME'
const secondColName = 'ADDRESS'

////////////////////////////
///// HELPER FUNCTIONS /////
////////////////////////////

/**
 * Converts the hour string we receive as '9AM' or '10PM'.
 * to a number between 0-23.
 *
 * @param {String} time - The string representation of time, Example: '9AM' or '10PM'.
 * @returns {Number} An hour (number) between 0-23 (think military time).
 */
function getHour(time){
  var retVal = Number(time.substring(0, time.length - 2));
  if (time.indexOf("PM") !== -1 && retVal !== 12){
    retVal += 12;
  }
  return retVal;
}

/**
 * Determines which food trucks are open given the current time this program is run.
 *
 * @param {any} data - The raw food truck data.
 * @returns {data} The food truck data of only those food trucks that are currently open.
 */
function getOpenFoodTrucks(data){
  const res = data.filter(truck => {
    // Current date, hour, and day
    const date = new Date();
    const curHour = date.getHours();
    const curDay = date.getDay();

    // Parse starttime and endtime removing "AM" and "PM"
    const start = getHour(truck.starttime);
    const end = getHour(truck.endtime)
    const day = Number(truck.dayorder);

    // Current time must be >= opening time
    // Current time must be <= closing time
    // Current day must be == day the truck is open
    return curHour >= start && curHour <= end && day == curDay;
  });
  return res;
}

/**
 * Sorts the food trucks by applicant (name) then by location (if the names are the same).
 *
 * @param {any[]} openTrucks - The raw food truck data - but only those trucks that are currently open for business.
 * @returns {any[]} The array of trucks (sorted) containing JS objects with 2 properties: {applicant, location}.
 */
function sortTrucksByApplicantThenLocation(openTrucks){
  var retVal = [];

  // Take a subset of the data {name (aka applicant), location}
  for (var i = 0; i < openTrucks.length; ++i) {
    retVal.push({applicant: openTrucks[i].applicant, location: openTrucks[i].location});
  }

  // Sort by name (aka applicant)
  retVal.sort((x,y) => {

    // Prioritize sorting by applicant (name)
    if (x.applicant < y.applicant) return -1;
    if (x.applicant > y.applicant) return 1;

    // Applicant names are equal - now sort by location!
    if (x.location < y.location) return -1;
    if (x.location > y.location) return 1;

    // both application and location are exactly equal - though this should never happen
    // Unless the JSON data we read has a duplicate!
    // This will not affect the sort though - duplicates will be placed next to each other.
    return 0;
  });

  return retVal;
}

/**
 * Gets the length of the longest food truck applicant (name).
 *
 * @param {any[]} trucks - The array of trucks containing JS objects with 2 properties: {applicant, location}.
 * @returns {Number} The length of the longest food truck applicant (name).
 */
function getMaximumFoodTruckNameLength(trucks){
  var max = 0;
  for (var i = 0; i < trucks.length; ++i){
    if (trucks[i].applicant.length > max){
      max = trucks[i].applicant.length;
    }
  }
  return max;
}

/**
 * Prints all the trucks, stopping every 10 records and waiting for user input.
 *
 * @param {any[]} trucks - The array of trucks containing JS objects with 2 properties: {applicant, location}.
 * @param {Number} max - The length of the longest applicant (food truck name) for all the food trucks that are currently open.
 */
async function printTrucks(trucks, max){
  for (var i = 0; i < trucks.length; ++i){

    // Wait for user input
    if (i !== 0 && i % 10 === 0){
      await waitForUserInput();
    }

    // Get the current truck
    const truck = trucks[i];

    // Calculate the number of spaces to use
    const numSpaces = max - truck.applicant.length + 1 + colBuffer;
    const spacesToUse = ' '.repeat(numSpaces > 0 ? numSpaces : 1 + colBuffer);

    // Print truck data out!
    console.log(`${truck.applicant}${spacesToUse}${truck.location}`);
  }
}

/**
 * Waits for user input.
 */
function waitForUserInput(){
  const read = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // Empty question - just waiting for user input to continue...
  return new Promise(resolve => read.question('', ans => {
    read.close();
    resolve(ans);
  }));
}

////////////////////////
///// MAIN SECTION /////
////////////////////////

// Get the data...
fetch(url).then(data => {

  // We were not able to fetch the data for some reason...
  if (!data.ok) {
    console.log(`There is currently some error (${data.status}) fetching the data please try again later...`);
    return;
  }
  return data.json();
}) // "then" do something with it!
.then(data => {

  // Something bad happened fetching the data
  if (data === undefined){
    return;
  }

  // Get the current food trucks that are open
  const openTrucks = getOpenFoodTrucks(data);
  
  // Get the sorted trucks by name (aka applicant)
  const sortedTrucks = sortTrucksByApplicantThenLocation(openTrucks);

  // Find the maximum length food truck name
  const max = getMaximumFoodTruckNameLength(sortedTrucks);
  
  // For the headers to line up properly we need:
  // max - 'NAME'.length + 1 (at least 1 for readability) + colBuffer (extra space for more readability)
  const spacesForHeader = ' '.repeat(max - firstColName.length + 1 + colBuffer);
  console.log(`${firstColName}${spacesForHeader}${secondColName}`);
  
  // Print all the trucks
  printTrucks(sortedTrucks, max);
});