// import { auth, db } from './firebase.js';
// import {
//   createUserWithEmailAndPassword,
//   signInWithEmailAndPassword,
//   signOut,
//   onAuthStateChanged
// } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
// import {
//   collection,
//   addDoc,
//   getDocs,
//   query,
//   doc,
//   deleteDoc
// } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// // Auth functions
// export async function signUp(email, password) {
//   try {
//     const userCredential = await createUserWithEmailAndPassword(auth, email, password);
//     return userCredential.user;
//   } catch (error) {
//     throw error;
//   }
// }

// export async function logIn(email, password) {
//   try {
//     const userCredential = await signInWithEmailAndPassword(auth, email, password);
//     return userCredential.user;
//   } catch (error) {
//     throw error;
//   }
// }

// export async function logOut() {
//   await signOut(auth);
// }

// // Book management functions
// export async function addUserBook(bookData) {
//   try {
//     const user = auth.currentUser;
//     if (!user) throw new Error("User not authenticated");

//     // Store books under a subcollection of the user's UID
//     const userBooksRef = collection(db, "users", user.uid, "books");
//     const docRef = await addDoc(userBooksRef, {
//       ...bookData,
//       createdAt: new Date()
//     });
//     return docRef.id;
//   } catch (error) {
//     console.error("Error adding book:", error);
//     throw error;
//   }
// }

// export async function getUserBooks() {
//   try {
//     const user = auth.currentUser;
//     if (!user) throw new Error("User not authenticated");

//     // Query the books subcollection under the user's UID
//     const userBooksRef = collection(db, "users", user.uid, "books");
//     const q = query(userBooksRef);
//     const querySnapshot = await getDocs(q);

//     return querySnapshot.docs.map(doc => ({
//       id: doc.id,
//       ...doc.data()
//     }));
//   } catch (error) {
//     console.error("Error getting books:", error);
//     throw error;
//   }
// }

// export async function deleteUserBook(bookId) {
//   try {
//     const user = auth.currentUser;
//     if (!user) throw new Error("User not authenticated");

//     const bookRef = doc(db, "users", user.uid, "books", bookId);
//     await deleteDoc(bookRef);
//   } catch (error) {
//     console.error("Error deleting book:", error);
//     throw error;
//   }
// }

// // Auth UI Management
// export function initializeAuthUI() {
//   const authForm = document.getElementById('auth-form');
//   const emailInput = document.getElementById('auth-email');
//   const passwordInput = document.getElementById('auth-password');
//   const authError = document.getElementById('auth-error');
//   const toggleAuthText = document.getElementById('toggle-auth-mode');
//   const authTitle = document.getElementById('auth-title');
//   const authContainer = document.getElementById('auth-container');
//   const logoutBtn = document.getElementById('logout-btn');
//   const submitBtn = document.getElementById('auth-submit');
//   const mainContent = document.getElementById('main-content');
//   const appHeader = document.getElementById('app-header');
//   const bookListContainer = document.getElementById('book-list'); // Add container to display books

//   let isSignUpMode = false;

//   // Toggle between Sign Up and Login
//   toggleAuthText.addEventListener('click', (e) => {
//     e.preventDefault();
//     isSignUpMode = !isSignUpMode;
//     authTitle.textContent = isSignUpMode ? 'Sign Up' : 'Login';
//     toggleAuthText.innerHTML = isSignUpMode 
//       ? 'Already have an account? <a href="#">Login</a>' 
//       : 'Don\'t have an account? <a href="#">Sign up</a>';
//     authError.textContent = '';
//     submitBtn.textContent = isSignUpMode ? 'Sign Up' : 'Login';
//     authForm.reset();
//     emailInput.focus();
//   });

//   // Handle form submission
//   authForm.addEventListener('submit', async (e) => {
//     e.preventDefault();
//     const email = emailInput.value.trim();
//     const password = passwordInput.value.trim();

//     // Clear previous errors
//     authError.textContent = '';
//     authError.style.color = 'red';

//     // Validation
//     if (!email || !password) {
//       authError.textContent = 'Please fill out both fields';
//       return;
//     }

//     if (isSignUpMode && password.length < 6) {
//       authError.textContent = 'Password must be at least 6 characters';
//       return;
//     }

//     // Show loading state
//     submitBtn.disabled = true;
//     submitBtn.textContent = 'Processing...';

//     try {
//       if (isSignUpMode) {
//         await signUp(email, password);
//         authError.style.color = 'green';
//         authError.textContent = 'Sign up successful!';
//       } else {
//         await logIn(email, password);
//         authError.style.color = 'green';
//         authError.textContent = 'Login successful!';
//       }
//     } catch (error) {
//       authError.textContent = error.message;
//     } finally {
//       submitBtn.disabled = false;
//       submitBtn.textContent = isSignUpMode ? 'Sign Up' : 'Login';
//     }
//   });

//   // Handle logout
//   logoutBtn.addEventListener('click', async () => {
//     try {
//       await logOut();
//     } catch (error) {
//       console.error("Logout error:", error);
//     }
//   });

//   // Auth state observer
//   onAuthStateChanged(auth, (user) => {
//     if (user) {
//       // User is logged in
//       console.log("User signed in:", user.uid);
//       if (authContainer) authContainer.style.display = 'none';
//       if (mainContent) mainContent.style.display = 'block';
//       if (logoutBtn) {
//         logoutBtn.style.display = 'block';
//         logoutBtn.textContent = `Logout (${user.email})`;
//       }
//       if (appHeader) appHeader.style.display = 'flex';

//       // Fetch and display user's books
//       getUserBooks().then(books => {
//         if (bookListContainer) {
//           bookListContainer.innerHTML = books.length > 0
//             ? books.map(book => `
//                 <div class="book-card">
//                   <h3>${book.title}</h3>
//                   <p>${book.author}</p>
//                   <button onclick="deleteUserBook('${book.id}')">Delete</button>
//                 </div>
//               `).join('')
//             : '<p>No books found. Add some!</p>';
//         }
//       }).catch(error => {
//         console.error("Error fetching books:", error);
//       });

//     } else {
//       // User is logged out
//       if (authContainer) authContainer.style.display = 'block';
//       if (mainContent) mainContent.style.display = 'none';
//       if (logoutBtn) logoutBtn.style.display = 'none';
//       if (appHeader) appHeader.style.display = 'none';
//     }
//   });
// }
