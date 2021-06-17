let db;
let budgetVersion;

// Create a new db request for a "budget" database
const request = indexedDB.open("BudgetDB", budgetVersion || 1);

// Creating an object store inside the onupgradeneeded method. This is where data will be held for database.
request.onupgradeneeded = function (e) {
  console.log("Upgrade needed in IndexDB");

  const { oldVersion } = e;
  const newVersion = e.newVersion || db.version;

  console.log(`DB Updated from version ${oldVersion} to ${newVersion}`);

  // Grabbing a reference to our database
  const db = e.target.result;

  // Creating store to hold data
  if (db.objectStoreNames.length === 0) {
    db.createObjectStore("budget", { autoIncrement: true });
  }
};

// If error, display it
request.onerror = function (e) {
  console.log(`There is an error: ${e.target.errorCode}`);
};

// Declaring the checkDatabase function
function checkDatabase() {
  console.log("Currently checking databse...");

  // Open a transaction on budget db
  let transaction = db.transaction(["budget"], "readwrite");

  // Access the budget object
  const store = transaction.objectStore("budget");

  // Get all records from the store and set to a variable
  const getAll = store.getAll();

  // If the request was successful
  getAll.onsuccess = function () {
    // If there are items in the store, we need to bulk add them when we are back online
    if (getAll.result.length > 0) {
      fetch("/api/transaction/bulk", {
        method: "POST",
        body: JSON.stringify(getAll.result),
        headers: {
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/json",
        },
      })
        .then((response) => response.json())
        .then((res) => {
          // If the returned response is not empty
          if (res.length !== 0) {
            // Open another transaction to budget with the ability to read and write
            transaction = db.transaction(["budget"], "readwrite");

            // Assign the current store to the variable
            const currentStore = transaction.objectStore("budget");

            // Clear existing entries because our bulk add was successful
            currentStore.clear();
            console.log("Clearing store...");
          }
        });
    }
  };
}

// On success, run checkDatabase function
request.onsuccess = function (e) {
  console.log("success");
  db = e.target.result;

  // Check if the application is back o nline before reading from db
  if (navigator.onLine) {
    console.log("Backedn online!");
    checkDatabase();
  }
};

const saveRecord = (record) => {
  console.log("Save recorde invoked");

  // Create a transaction on the budget db with readwrite access
  const transaction = db.transaction(["budget"], "readwrite");

  // Access budget object store
  const store = transaction.objectStore("budget");

  // Add record to store with add method
  store.add(record);
};

// Listen for app coming back online
window.addEventListener("online", checkDatabase);
