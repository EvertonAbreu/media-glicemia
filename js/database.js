
import { db, auth } from './firebase-config.js';
import { 
    collection, addDoc, getDocs, doc, setDoc, getDoc, query, orderBy, deleteDoc 
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

let allRecords = [];

export async function saveUserProfile(userId, profileData) {
    await setDoc(doc(db, "users", userId), {
        ...profileData,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
    });
}

export async function loadUserProfile(userId) {
    const docRef = doc(db, "users", userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        const userNameElem = document.getElementById('userName');
        const diabetesTimeElem = document.getElementById('diabetesTime');
        const profileNameElem = document.getElementById('profileName');
        const profileEmailElem = document.getElementById('profileEmail');
        const profileAgeElem = document.getElementById('profileAge');
        const profileDiabetesTimeElem = document.getElementById('profileDiabetesTime');
        const memberSinceElem = document.getElementById('memberSince');
        
        if (userNameElem) userNameElem.textContent = data.name;
        if (diabetesTimeElem) diabetesTimeElem.textContent = data.diabetesTime || 0;
        if (profileNameElem) profileNameElem.textContent = data.name;
        if (profileEmailElem) profileEmailElem.textContent = data.email;
        if (profileAgeElem) profileAgeElem.textContent = data.age + ' anos';
        if (profileDiabetesTimeElem) profileDiabetesTimeElem.textContent = data.diabetesTime + ' anos';
        if (memberSinceElem) memberSinceElem.textContent = data.createdAt ? new Date(data.createdAt).toLocaleDateString('pt-BR') : 'Recentemente';
    }
}

export async function saveGlucose(record) {
    const user = auth.currentUser;
    if (!user) return;
    await addDoc(collection(db, "users", user.uid, "glucose"), {
        ...record,
        createdAt: new Date().toISOString()
    });
}

export async function loadGlucose() {
    const user = auth.currentUser;
    if (!user) return [];
    
    const q = query(collection(db, "users", user.uid, "glucose"), orderBy("datetime", "desc"));
    const querySnapshot = await getDocs(q);
    const records = [];
    querySnapshot.forEach((doc) => {
        records.push({ id: doc.id, ...doc.data() });
    });
    allRecords = records;
    
    const totalReadingsElem = document.getElementById('profileTotalReadings');
    if (totalReadingsElem) totalReadingsElem.textContent = records.length;
    
    return records;
}

export async function deleteGlucose(recordId) {
    const user = auth.currentUser;
    if (!user) return;
    await deleteDoc(doc(db, "users", user.uid, "glucose", recordId));
}

export function getRecords() {
    return allRecords;
}

export function setRecords(records) {
    allRecords = records;
}
