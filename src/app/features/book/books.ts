import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthorsService } from '../service/authors';
import { BooksService } from '../service/books';
import { LoansService } from '../service/loans';
import { Author, AuthorDTO, Book, BookDTO, Loan, LoanDTO } from './model/books.model';

type WorkspaceTab = 'books' | 'loans' | 'authors';
type DialogMode = 'book' | 'loan' | 'author' | 'deleteBook' | 'deleteAuthor' | null;
type AvailabilityFilter = 'all' | 'available' | 'loaned';
type LoanFilter = 'active' | 'returned' | 'all';

interface FeedbackMessage {
  kind: 'success' | 'error';
  text: string;
}

interface BookForm {
  title: string;
  isbn: string;
  authorId: string;
  year: number | null;
}

interface AuthorForm {
  name: string;
  nationality: string;
  birthYear: number | null;
}

interface LoanForm {
  bookId: string;
  userName: string;
}

@Component({
  selector: 'app-books',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink],
  templateUrl: './books.html',
})
export class BooksComponent {
  private readonly booksService = inject(BooksService);
  private readonly authorsService = inject(AuthorsService);
  private readonly loansService = inject(LoansService);

  readonly pageSize = 100;
  readonly books = signal<Book[]>([]);
  readonly availableBooksForLoan = signal<Book[]>([]);
  readonly authors = signal<Author[]>([]);
  readonly loans = signal<Loan[]>([]);
  readonly activeLoanTotal = signal(0);
  readonly totalBookCount = signal(0);
  readonly availableBookCount = signal(0);
  readonly filteredBookCount = signal(0);
  readonly bookPage = signal(1);
  readonly bookPageCount = signal(1);
  readonly isLoadingBooks = signal(true);
  readonly isLoadingLoans = signal(true);
  readonly isLoadingAvailableBooks = signal(false);
  readonly isSaving = signal(false);
  readonly dialog = signal<DialogMode>(null);
  readonly feedback = signal<FeedbackMessage | null>(null);
  readonly loanError = signal<string | null>(null);

  // Interpolation reads these values; property bindings use them to disable invalid actions.
  readonly borrowedBookCount = computed(() =>
    Math.max(this.totalBookCount() - this.availableBookCount(), 0)
  );
  readonly activeLoans = computed(() => this.loans().filter((loan) => !loan.returned));
  readonly returnedLoans = computed(() => this.loans().filter((loan) => loan.returned));

  // These plain fields are paired with [(ngModel)] in the forms and search controls.
  activeTab: WorkspaceTab = 'books';
  searchTerm = '';
  availabilityFilter: AvailabilityFilter = 'all';
  loanFilter: LoanFilter = 'active';
  bookDraft: BookForm = this.emptyBookForm();
  authorDraft: AuthorForm = this.emptyAuthorForm();
  loanDraft: LoanForm = this.emptyLoanForm();
  editingBook: Book | null = null;
  editingAuthor: Author | null = null;
  pendingDeleteBook: Book | null = null;
  pendingDeleteAuthor: Author | null = null;

  constructor() {
    this.refreshDashboard();
  }

  // Returns the current page after applying the local title, ISBN, and author search.
  get filteredBooks(): Book[] {
    const term = this.searchTerm.trim().toLocaleLowerCase();
    return this.books().filter((book) => {
      if (!term) return true;
      const author = this.authorName(book.authorId).toLocaleLowerCase();
      return [book.title, book.isbn, author].some((value) =>
        value.toLocaleLowerCase().includes(term)
      );
    });
  }

  // Applies the selected status to the loans table without changing the server data.
  get visibleLoans(): Loan[] {
    if (this.loanFilter === 'active') return this.activeLoans();
    if (this.loanFilter === 'returned') return this.returnedLoans();
    return this.loans();
  }

  // Reloads each resource independently so an API failure is reported in its own area.
  refreshDashboard(): void {
    this.loadBooks();
    this.loadBookStatistics();
    this.loadAuthors();
    this.loadLoans();
  }

  // Changes the active navigation panel.
  setTab(tab: WorkspaceTab): void {
    this.activeTab = tab;
    this.feedback.set(null);
  }

  // Resets pagination and reloads the catalog when its availability filter changes.
  applyAvailabilityFilter(): void {
    this.bookPage.set(1);
    this.loadBooks();
  }

  // Resolves the author name because the API returns only authorId with each book.
  authorName(authorId: string): string {
    return this.authors().find((author) => author._id === authorId)?.name ?? 'Autor no disponible';
  }

  // Resolves the book title for the loan history table.
  bookTitle(bookId: string): string {
    return this.books().find((book) => book._id === bookId)?.title ?? 'Libro no disponible';
  }

  // Finds the active loan for a book so its borrower and status can be shown in the catalog.
  activeLoanFor(bookId: string | undefined): Loan | undefined {
    if (!bookId) return undefined;
    return this.activeLoans().find((loan) => loan.bookId === bookId);
  }

  // Opens the create or edit book form and fills it when a book was selected.
  openBookForm(book?: Book): void {
    this.editingBook = book ?? null;
    this.bookDraft = book
      ? {
          title: book.title,
          isbn: book.isbn,
          authorId: book.authorId,
          year: book.year ?? null,
        }
      : this.emptyBookForm();
    this.dialog.set('book');
    this.feedback.set(null);
  }

  // Validates the local form and sends a create or update request to the API.
  saveBook(): void {
    const payload: BookDTO = {
      title: this.bookDraft.title.trim(),
      isbn: this.bookDraft.isbn.trim(),
      authorId: this.bookDraft.authorId,
      ...(this.bookDraft.year ? { year: this.bookDraft.year } : {}),
    };
    const request = this.editingBook?._id
      ? this.booksService.updateBook(this.editingBook._id, payload)
      : this.booksService.createBook(payload);

    this.isSaving.set(true);
    request.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.closeDialog();
        this.showSuccess(this.editingBook ? 'Libro actualizado.' : 'Libro agregado al catálogo.');
        this.loadBooks();
        this.loadBookStatistics();
      },
      error: (error: unknown) => {
        this.isSaving.set(false);
        this.showApiError(error, 'No se pudo guardar el libro.');
      },
    });
  }

  // Opens a separate confirmation so a user cannot delete a book by a misclick.
  askDeleteBook(book: Book): void {
    this.pendingDeleteBook = book;
    this.dialog.set('deleteBook');
  }

  // Deletes the selected book; the API prevents deletion while a loan is active.
  deleteBook(): void {
    const bookId = this.pendingDeleteBook?._id;
    if (!bookId) return;

    this.isSaving.set(true);
    this.booksService.deleteBook(bookId).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.closeDialog();
        this.showSuccess('Libro eliminado.');
        this.loadBooks();
        this.loadBookStatistics();
      },
      error: (error: unknown) => {
        this.isSaving.set(false);
        this.closeDialog();
        this.showApiError(error, 'No se pudo eliminar el libro.');
      },
    });
  }

  // Opens the loan form and optionally preselects the book from the catalog.
  openLoanForm(book?: Book): void {
    this.loanDraft = {
      bookId: book?._id ?? '',
      userName: '',
    };
    this.availableBooksForLoan.set([]);
    this.isLoadingAvailableBooks.set(true);
    this.loanError.set(null);
    this.dialog.set('loan');
    this.feedback.set(null);
    this.booksService.getBooks(1, this.pageSize, true).subscribe({
      next: (response) => {
        this.availableBooksForLoan.set(response.data);
        this.isLoadingAvailableBooks.set(false);
        if (book?._id && !response.data.some((availableBook) => availableBook._id === book._id)) {
          this.loanDraft.bookId = '';
          this.loanError.set('Ese libro ya no está disponible. Selecciona otro de la lista.');
        }
      },
      error: (error: unknown) => {
        this.isLoadingAvailableBooks.set(false);
        this.loanError.set(
          this.apiErrorMessage(error, 'No se pudieron cargar los libros disponibles.')
        );
      },
    });
  }

  // Creates a loan using the API's userName field; the API marks the book unavailable.
  saveLoan(): void {
    if (this.isSaving()) return;

    const payload: LoanDTO = {
      bookId: this.loanDraft.bookId.trim(),
      userName: this.loanDraft.userName.trim(),
    };

    if (!payload.bookId || !payload.userName) {
      this.loanError.set('Selecciona un libro y escribe el nombre de quien lo recibe.');
      return;
    }

    if (!this.availableBooksForLoan().some((book) => book._id === payload.bookId)) {
      this.loanError.set('El libro ya no está disponible. Cierra y vuelve a abrir el formulario.');
      return;
    }

    this.loanError.set(null);
    this.isSaving.set(true);
    this.loansService.createLoan(payload).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.closeDialog();
        this.showSuccess('Préstamo registrado.');
        this.loadBooks();
        this.loadBookStatistics();
        this.loadLoans();
      },
      error: (error: unknown) => {
        this.isSaving.set(false);
        this.loanError.set(this.apiErrorMessage(error, 'No se pudo registrar el préstamo.'));
      },
    });
  }

  // Marks a loan as returned; the API records its return date and frees the book.
  returnLoan(loan: Loan): void {
    if (!loan._id) return;

    this.loansService.returnLoan(loan._id).subscribe({
      next: () => {
        this.showSuccess(`Devolución registrada para ${loan.userName}.`);
        this.loadBooks();
        this.loadBookStatistics();
        this.loadLoans();
      },
      error: (error: unknown) => this.showApiError(error, 'No se pudo registrar la devolución.'),
    });
  }

  // Opens the create or edit author form; authors can be managed without leaving the dashboard.
  openAuthorForm(author?: Author): void {
    this.editingAuthor = author ?? null;
    this.authorDraft = author
      ? {
          name: author.name,
          nationality: author.nationality,
          birthYear: author.birthYear ?? null,
        }
      : this.emptyAuthorForm();
    this.dialog.set('author');
    this.feedback.set(null);
  }

  // Opens the author form if a new book needs an author not in the catalog.
  openAuthorFormFromBook(): void {
    this.closeDialog();
    this.setTab('authors');
    this.openAuthorForm();
  }

  // Saves an author so the book form can reference a real author ID.
  saveAuthor(): void {
    const payload: AuthorDTO = {
      name: this.authorDraft.name.trim(),
      nationality: this.authorDraft.nationality.trim(),
      ...(this.authorDraft.birthYear ? { birthYear: this.authorDraft.birthYear } : {}),
    };
    const request = this.editingAuthor?._id
      ? this.authorsService.updateAuthor(this.editingAuthor._id, payload)
      : this.authorsService.createAuthor(payload);

    this.isSaving.set(true);
    request.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.closeDialog();
        this.showSuccess(this.editingAuthor ? 'Autor actualizado.' : 'Autor agregado.');
        this.loadAuthors();
      },
      error: (error: unknown) => {
        this.isSaving.set(false);
        this.showApiError(error, 'No se pudo guardar el autor.');
      },
    });
  }

  // Opens a confirmation before removing an author from the catalog.
  askDeleteAuthor(author: Author): void {
    this.pendingDeleteAuthor = author;
    this.dialog.set('deleteAuthor');
  }

  // Deletes an author; the API rejects deletion when books still reference the author.
  deleteAuthor(): void {
    const authorId = this.pendingDeleteAuthor?._id;
    if (!authorId) return;

    this.isSaving.set(true);
    this.authorsService.deleteAuthor(authorId).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.closeDialog();
        this.showSuccess('Autor eliminado.');
        this.loadAuthors();
      },
      error: (error: unknown) => {
        this.isSaving.set(false);
        this.closeDialog();
        this.showApiError(error, 'No se pudo eliminar el autor.');
      },
    });
  }

  // Closes the active dialog without discarding server data.
  closeDialog(): void {
    this.dialog.set(null);
    this.pendingDeleteBook = null;
    this.pendingDeleteAuthor = null;
    this.loanError.set(null);
  }

  // Clears the inline loan message after the user updates a required field.
  clearLoanError(): void {
    this.loanError.set(null);
  }

  // Returns to the catalog when a loan cannot be registered because no book is available.
  goToBookCatalog(): void {
    this.closeDialog();
    this.setTab('books');
  }

  // Removes the visible status message after the user has read it.
  clearFeedback(): void {
    this.feedback.set(null);
  }

  // Loads one book page and sends the availability filter to the server.
  private loadBooks(): void {
    this.isLoadingBooks.set(true);
    const available =
      this.availabilityFilter === 'all'
        ? undefined
        : this.availabilityFilter === 'available';

    this.booksService.getBooks(this.bookPage(), this.pageSize, available).subscribe({
      next: (response) => {
        this.books.set(response.data);
        this.filteredBookCount.set(response.total);
        this.bookPageCount.set(Math.max(response.totalPages, 1));
        this.isLoadingBooks.set(false);
        if (this.bookPage() > this.bookPageCount()) {
          this.bookPage.set(this.bookPageCount());
          this.loadBooks();
        }
      },
      error: (error: unknown) => {
        this.isLoadingBooks.set(false);
        this.showApiError(error, 'No se pudo cargar el catálogo.');
      },
    });
  }

  // Loads accurate catalog totals even when the visible list is filtered or paginated.
  private loadBookStatistics(): void {
    this.booksService.getBooks(1, 1).subscribe({
      next: (response) => this.totalBookCount.set(response.total),
      error: (error: unknown) => this.showApiError(error, 'No se pudieron cargar las estadísticas de libros.'),
    });
    this.booksService.getBooks(1, 1, true).subscribe({
      next: (response) => this.availableBookCount.set(response.total),
      error: (error: unknown) => this.showApiError(error, 'No se pudo consultar la disponibilidad.'),
    });
  }

  // Loads authors for the author panel and the book form selector.
  private loadAuthors(): void {
    this.authorsService.getAuthors().subscribe({
      next: (response) => this.authors.set(response.data),
      error: (error: unknown) => this.showApiError(error, 'No se pudo cargar la lista de autores.'),
    });
  }

  // Loads recent loan records and the total count of active loans.
  private loadLoans(): void {
    this.isLoadingLoans.set(true);
    this.loansService.getLoans().subscribe({
      next: (response) => {
        this.loans.set(response.data);
        this.isLoadingLoans.set(false);
      },
      error: (error: unknown) => {
        this.isLoadingLoans.set(false);
        this.showApiError(error, 'No se pudo cargar el historial de préstamos.');
      },
    });
    this.loansService.getActiveLoans(1, 1).subscribe({
      next: (response) => this.activeLoanTotal.set(response.total),
      error: (error: unknown) => this.showApiError(error, 'No se pudo consultar el total de préstamos activos.'),
    });
  }

  // Requests the previous or next server page while respecting pagination boundaries.
  changeBookPage(offset: number): void {
    const nextPage = this.bookPage() + offset;
    if (nextPage < 1 || nextPage > this.bookPageCount()) return;
    this.bookPage.set(nextPage);
    this.loadBooks();
  }

  // Clears the search and returns the book list to its first server page.
  resetBookSearch(): void {
    this.searchTerm = '';
    this.bookPage.set(1);
    this.loadBooks();
  }

  // Maps known API error responses to a readable message and preserves the fallback context.
  private showApiError(error: unknown, fallback: string): void {
    this.feedback.set({ kind: 'error', text: this.apiErrorMessage(error, fallback) });
  }

  // Uses a readable API message when present and otherwise keeps the operation context.
  private apiErrorMessage(error: unknown, fallback: string): string {
    const apiMessage =
      error instanceof HttpErrorResponse &&
      typeof error.error?.message === 'string'
        ? error.error.message
        : null;
    return apiMessage ?? fallback;
  }

  // Sets a success message in the shared status region.
  private showSuccess(text: string): void {
    this.feedback.set({ kind: 'success', text });
  }

  // Creates a clean book form model for new records.
  private emptyBookForm(): BookForm {
    return { title: '', isbn: '', authorId: '', year: null };
  }

  // Creates a clean author form model for new records.
  private emptyAuthorForm(): AuthorForm {
    return { name: '', nationality: '', birthYear: null };
  }

  // Creates a clean loan form model before each new checkout.
  private emptyLoanForm(): LoanForm {
    return { bookId: '', userName: '' };
  }
}
