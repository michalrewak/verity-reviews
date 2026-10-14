const DATABASE_NAME = "verity-author-keys";
const STORE_NAME = "keys";

export async function putAuthorKey(record) {
  const database = await openDatabase();
  await transactionPromise(database, "readwrite", (store) => store.put(record));
  database.close();
}

export async function getAuthorKey(keyId) {
  const database = await openDatabase();
  const value = await transactionPromise(database, "readonly", (store) => store.get(keyId));
  database.close();
  return value;
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME, { keyPath: "keyId" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionPromise(database, mode, operation) {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const request = operation(transaction.objectStore(STORE_NAME));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.onerror = () => reject(transaction.error);
  });
}
