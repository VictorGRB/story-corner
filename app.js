import { db } from './firebase.js';
import {
    collection,
    getDocs,
    addDoc,
    deleteDoc,
    doc,
    updateDoc,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// DOM elements
const bookForm = document.getElementById('book-form');
const titleInput = document.getElementById('title');
const bookList = document.getElementById('book-list');

// Clear form after submission
function clearForm() {
    titleInput.value = '';
    suggestionsList.innerHTML = '';
    suggestionsList.style.display = 'none';
    clearButton.style.display = 'none';  // Also hide the "X" button
    loadMoreButton.style.display = 'none'; // Hide load more
    currentPage = 1;
}

// Add new book
async function addBook(input) {
    // Show loading spinner
    document.getElementById("loading-spinner").style.display = "block";

    let title;

    // Determine if input is a string (suggestion click) or an event (form submit)
    if (typeof input === "string") {
        title = input.trim();
    } else {
        input.preventDefault();
        title = titleInput.value.trim();
    }

    if (!title) {
        document.getElementById("loading-spinner").style.display = "none";
        return;
    }

    const url = `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}`;
    const response = await fetch(url);

    if (!response.ok) {
        console.error("Failed to fetch data from Open Library:", response.status);
        document.getElementById("loading-spinner").style.display = "none";
        return;
    }

    const data = await response.json();

    if (data.docs.length === 0) {
        console.log("No book found with that title.");
        document.getElementById("loading-spinner").style.display = "none";
        return;
    }

    const book = data.docs[0];

    try {
        // Get current number of books to determine position
        const snapshot = await getDocs(collection(db, "books"));
        const position = snapshot.size;

        const bookData = {
            title: book.title || "Unknown",
            author: book.author_name?.[0] || "Unknown",
            status: "Not Started",
            cover: book.cover_i
                ? `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg`
                : 'https://placehold.co/200x300?text=No+Cover',
            publishYear: book.first_publish_year || "Unknown",
            position
        };

        const docRef = await addDoc(collection(db, "books"), bookData);
        console.log("Book added with ID:", docRef.id);
        clearForm();

        const bookCard = createBookCard(docRef.id, bookData);
        const img = bookCard.querySelector("img");

        if (img) {
            img.onload = () => {
                bookCard.classList.add("animate-in");
                bookList.appendChild(bookCard);
            };
            img.onerror = () => {
                bookCard.classList.add("animate-in");
                bookList.appendChild(bookCard);
            };
        } else {
            bookCard.classList.add("animate-in");
            bookList.appendChild(bookCard);
        }

    } catch (e) {
        console.error("Error adding book to Firestore: ", e);
    }

    document.getElementById("loading-spinner").style.display = "none";
}



// Load all books
async function loadBooks() {
    bookList.innerHTML = '';  // Clear the current book list
    const snapshot = await getDocs(collection(db, "books"));

    if (snapshot.empty) {
        console.log("No books found.");
        return;
    }

    const bookCards = [];
    const imagePromises = [];

    // Map Firestore docs to an array and sort them by position
    const books = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        data: docSnap.data()
    }));

    // Sort books by the 'position' field
    books.sort((a, b) => a.data.position - b.data.position);

    // Create book cards for each book
    books.forEach(({ id, data }) => {
        const bookCard = createBookCard(id, data);
        const img = bookCard.querySelector("img");

        if (img) {
            const imgPromise = new Promise(resolve => {
                img.onload = resolve;
                img.onerror = resolve;
            });
            imagePromises.push(imgPromise);
        }

        bookCards.push(bookCard);
    });

    // Wait for all images to load before appending the cards
    await Promise.all(imagePromises);

    // Append the sorted book cards to the DOM
    for (const card of bookCards) {
        card.classList.add("animate-in");
        bookList.appendChild(card);
    }

    // Initialize the Sortable functionality
    const sortable = new Sortable(bookList, {
        ghostClass: 'sortable-ghost',
        dragClass: 'sortable-drag',

        setData: function () { },  // Prevent the default drag image

        onStart(evt) {
            const draggedItem = evt.item;
            // Visual changes for dragged item
            draggedItem.style.opacity = '1';
            draggedItem.style.visibility = 'hidden';
            
            // Add class to disable hover effects
            document.body.classList.add('dragging-active');
            // Force reflow to ensure CSS applies immediately
            void bookList.offsetWidth;
        },

        onEnd: async (evt) => {
            const bookCards = [...bookList.children];
            const positionPromises = [];
            const draggedItem = evt.item;
    
            // Restore dragged item visibility
            draggedItem.style.visibility = 'visible';
            
            // Remove the drag state class
            document.body.classList.remove('dragging-active');
    
            // Position updates (keep your existing logic)
            bookCards.forEach((card, index) => {
                const bookId = card.id;
                const position = index;
    
                positionPromises.push(
                    updateDoc(doc(db, "books", bookId), { position })
                        .then(() => console.log(`Updated position for ${bookId} to ${position}`))
                        .catch(e => console.error(`Failed to update position for ${bookId}:`, e))
                );
            });
    
            await Promise.all(positionPromises);
            console.log("Final order after drag:", bookCards.map(card => card.id));
        },
        
        // New event to handle drag over other items
        onMove(evt) {
            // Temporarily disable hover effects on the dragged-over item
            if (evt.related) {
                evt.related.classList.add('no-hover-effect');
            }
        },
        
        onDrag(evt) {
            // Ensure all cards except the dragged one ignore hover
            [...bookList.children].forEach(card => {
                if (card !== evt.item) {
                    card.classList.add('no-hover-effect');
                }
            });
        }
    });
}


// Create UI card for each book
function createBookCard(bookId, bookData) {
    const card = document.createElement("div");
    card.classList.add("book-card");

    // Set the book card's id to the Firestore document ID
    card.id = bookId;  // Set the ID to match the document ID

    const title = document.createElement("h3");
    title.innerText = bookData.title;
    card.appendChild(title);

    const cover = document.createElement("img");
    cover.src = bookData.cover;

    // Add a one-time listener for when the image finishes loading
    cover.onload = () => {
        card.classList.add("animate-in");
    };

    // Optional: If image fails to load, still show animation
    cover.onerror = () => {
        card.classList.add("animate-in");
    };

    card.appendChild(cover);

    const author = document.createElement("p");
    author.innerText = `Author: ${bookData.author}`;
    card.appendChild(author);

    const year = document.createElement("p");
    year.innerText = `Published: ${bookData.publishYear}`;
    card.appendChild(year);

    // Status
    const statusLabel = document.createElement("label");
    statusLabel.innerText = "Status: ";
    card.appendChild(statusLabel);

    const statusSelect = document.createElement("select");
    ["Not Started", "In Progress", "Completed"].forEach(status => {
        const option = document.createElement("option");
        option.value = status;
        option.innerText = status;
        if (bookData.status === status) option.selected = true;
        statusSelect.appendChild(option);
    });

    statusSelect.addEventListener("change", async () => {
        const updated = statusSelect.value;
        try {
            await updateDoc(doc(db, "books", bookId), { status: updated });
            console.log(`Updated status: ${updated}`);
        } catch (e) {
            console.error("Failed to update status:", e);
        }
    });

    card.appendChild(statusSelect);

    // Rating
    const ratingLabel = document.createElement("label");
    ratingLabel.innerText = " Rating: ";
    card.appendChild(ratingLabel);

    const ratingSelect = document.createElement("select");
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.innerText = "Select";
    ratingSelect.appendChild(defaultOption);

    for (let i = 1; i <= 5; i++) {
        const option = document.createElement("option");
        option.value = i;
        option.innerText = i;
        if (bookData.rating == i) option.selected = true;
        ratingSelect.appendChild(option);
    }

    ratingSelect.addEventListener("change", async () => {
        const selected = parseInt(ratingSelect.value, 10);
        if (!isNaN(selected)) {
            try {
                await updateDoc(doc(db, "books", bookId), { rating: selected });
                console.log(`Updated rating: ${selected}`);
            } catch (e) {
                console.error("Failed to update rating:", e);
            }
        }
    });

    card.appendChild(ratingSelect);

    // Delete
    const deleteBtn = document.createElement("button");
    deleteBtn.innerText = "Delete";
    deleteBtn.classList.add("delete-btn");
    deleteBtn.addEventListener("click", () => deleteBook(bookId));
    card.appendChild(deleteBtn);

    return card;
}

// Delete a book
async function deleteBook(bookId) {
    const bookCard = document.getElementById(bookId);  // Get the book card by its ID
    if (!bookCard) {
        console.error("Book card not found!");
        return;
    }

    // Show the custom confirmation modal
    const confirmationModal = document.getElementById("confirmationModal");
    const confirmButton = document.getElementById("confirmDelete");
    const cancelButton = document.getElementById("cancelDelete");

    // Show modal
    confirmationModal.style.display = "flex";

    // Wait for the user's response
    const userConfirmed = new Promise((resolve) => {
        // Resolve the promise based on user action
        confirmButton.addEventListener("click", () => resolve(true));
        cancelButton.addEventListener("click", () => resolve(false));
    });

    const isConfirmed = await userConfirmed;

    // Close the modal after user's response
    confirmationModal.style.display = "none";

    if (!isConfirmed) {
        console.log("Deletion canceled.");
        return;  // Exit the function if the user cancels
    }

    // Add fade-out animation before removing the card
    bookCard.classList.add("fade-out");

    // Wait for the animation to complete before removing the card
    setTimeout(async () => {
        try {
            // Remove the book from Firestore
            await deleteDoc(doc(db, "books", bookId));
            console.log("Deleted:", bookId);

            // Now remove the book card from the DOM after the animation
            bookCard.remove();
        } catch (e) {
            console.error("Failed to delete:", e);
        }
    }, 300);  // Match the timeout duration with the animation duration (300ms)
}

// DOM elements for suggestions
const suggestionsList = document.getElementById('suggestions-list');

// Debounce helper
function debounce(func, delay) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}
const suggestionsSpinner = document.getElementById('suggestions-spinner');

let currentPage = 1; // Start from page 1
const itemsPerPage = 20; // Number of items to load initially and on each "Load More"
let currentQuery = '';
// Modified fetchSuggestions with better control over input clearing
const fetchSuggestions = debounce(async () => {
    const query = titleInput.value.trim();

    if (!query) {
        suggestionsList.style.display = 'none';
        return;
    }

    suggestionsSpinner.style.display = 'block';
    suggestionsList.style.display = 'none';

    try {
        const res = await fetch(`https://openlibrary.org/search.json?title=${encodeURIComponent(query)}&limit=${itemsPerPage}&page=${currentPage}`);
        const data = await res.json();
        const suggestions = data.docs;

        suggestionsList.innerHTML = '';

        if (suggestions.length > 0) {
            suggestions.forEach(book => {
                const suggestionCard = document.createElement('div');
                suggestionCard.className = 'suggestion-card'; // Use className instead of classList

                // Add mouse events
                suggestionCard.addEventListener('mouseenter', () => {
                    suggestionCard.classList.add('scaled');
                });

                suggestionCard.addEventListener('mouseleave', () => {
                    suggestionCard.classList.remove('scaled');
                });

                // Force hardware acceleration for smoother transforms
                suggestionCard.style.willChange = 'transform';
                suggestionCard.style.transform = 'translateZ(0)';

                const titleEl = document.createElement('div');
                titleEl.className = 'suggestion-title';
                titleEl.textContent = book.title;

                const authorEl = document.createElement('div');
                authorEl.className = 'suggestion-author';
                authorEl.textContent = book.author_name?.[0] || "Unknown";

                suggestionCard.append(titleEl, authorEl);

                // Add mouse events directly to ensure they work
                suggestionCard.onmouseenter = () => {
                    suggestionCard.style.transform = 'scale(1.05)';
                    suggestionCard.style.zIndex = '10';
                };
                suggestionCard.onmouseleave = () => {
                    suggestionCard.style.transform = 'scale(1)';
                    suggestionCard.style.zIndex = '0';
                };

                suggestionCard.onclick = () => {
                    suggestionsList.innerHTML = '';
                    suggestionsList.style.display = 'none';
                    addBook(book.title);
                };

                suggestionsList.appendChild(suggestionCard);
            });

            suggestionsList.style.display = 'block';
        }

        loadMoreButton.style.display = data.docs.length === itemsPerPage ? 'block' : 'none';
    } catch (error) {
        console.error("Failed to fetch suggestions:", error);
    } finally {
        suggestionsSpinner.style.display = 'none';
    }
}, 500);

// Update the event listener for "Load More" button
document.getElementById('load-more').addEventListener('click', (event) => {
    // Prevent default behavior and stop the event from triggering other handlers
    event.preventDefault();
    event.stopPropagation();

    currentPage++; // Increase the page number to load the next batch of results
    fetchSuggestions(); // Fetch the next set of suggestions
});

// Trigger suggestions on input, but stop clearing input on load more
titleInput.addEventListener('input', (e) => {
    const query = titleInput.value.trim();

    if (query.length < 2) {
        suggestionsList.style.display = 'none';
        loadMoreButton.style.display = 'none';
        return;
    }

    currentPage = 1;
    suggestionsList.innerHTML = '';
    suggestionsList.style.display = 'none'; // Keep hidden until we have results
    fetchSuggestions();
});

const loadMoreButton = document.getElementById('load-more');
const clearButton = document.getElementById('clear-input');
const inputField = document.getElementById('title');

inputField.addEventListener('input', function () {
    if (inputField.value.trim() !== '') {
        clearButton.style.display = 'block';  // Show the "X" button
        loadMoreButton.style.display = 'none';   // Hide Load More if no need yet
    } else {
        clearButton.style.display = 'none';   // Hide the "X" button
        suggestionsList.style.display = 'none';  // Hide suggestions if input is empty
        loadMoreButton.style.display = 'none';   // Hide Load More button if input is empty
    }
});
// Clear input field and hide "X" button when clicked
clearButton.addEventListener('click', function () {
    inputField.value = '';  // Clear the input field
    clearButton.style.display = 'none';  // Hide the "X" button
    suggestionsList.style.display = 'none';  // Hide suggestions list
    loadMoreButton.style.display = 'none';   // Hide Load More button
});

// Init
bookForm.addEventListener("submit", addBook);
window.onload = loadBooks;