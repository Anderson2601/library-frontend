import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { AuthorsService } from '../service/authors';
import { BooksService } from '../service/books';
import { LoansService } from '../service/loans';
import { Author, Book, Loan, PaginatedResponse } from './model/books.model';
import { BooksComponent } from './books';

describe('BooksComponent loans', () => {
  const book: Book = {
    _id: 'book-1',
    title: 'Libro de prueba',
    isbn: '9781234567890',
    authorId: 'author-1',
    available: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  };
  const bookPage: PaginatedResponse<Book> = {
    data: [book],
    page: 1,
    limit: 100,
    total: 1,
    totalPages: 1,
  };
  const emptyLoanPage: PaginatedResponse<Loan> = {
    data: [],
    page: 1,
    limit: 100,
    total: 0,
    totalPages: 0,
  };
  const createdLoan: Loan = {
    _id: 'loan-1',
    bookId: book._id ?? '',
    userName: 'Ana Pérez',
    loanDate: '2026-01-01',
    returned: false,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  };
  let booksService: { getBooks: ReturnType<typeof vi.fn> };
  let authorsService: { getAuthors: ReturnType<typeof vi.fn> };
  let loansService: {
    getLoans: ReturnType<typeof vi.fn>;
    getActiveLoans: ReturnType<typeof vi.fn>;
    createLoan: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    booksService = { getBooks: vi.fn(() => of(bookPage)) };
    authorsService = {
      getAuthors: vi.fn(() => of({ data: [] as Author[], page: 1, limit: 100, total: 0, totalPages: 0 })),
    };
    loansService = {
      getLoans: vi.fn(() => of(emptyLoanPage)),
      getActiveLoans: vi.fn(() => of(emptyLoanPage)),
      createLoan: vi.fn(() => of(createdLoan)),
    };

    TestBed.configureTestingModule({
      imports: [BooksComponent],
      providers: [
        provideRouter([]),
        { provide: BooksService, useValue: booksService },
        { provide: AuthorsService, useValue: authorsService },
        { provide: LoansService, useValue: loansService },
      ],
    });
  });

  it('abre el formulario y carga la lista de libros disponibles', () => {
    const component = TestBed.createComponent(BooksComponent).componentInstance;

    component.openLoanForm(book);

    expect(component.dialog()).toBe('loan');
    expect(component.loanDraft.bookId).toBe(book._id);
    expect(component.loanDraft.loanDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(component.availableBooksForLoan()).toEqual([book]);
    expect(component.isLoadingAvailableBooks()).toBe(false);
  });

  it('explica los campos obligatorios y no envía un préstamo incompleto', () => {
    const component = TestBed.createComponent(BooksComponent).componentInstance;
    component.availableBooksForLoan.set([book]);
    component.loanDraft = { bookId: book._id ?? '', userName: '  ', loanDate: '' };

    component.saveLoan();

    expect(loansService.createLoan).not.toHaveBeenCalled();
    expect(component.loanError()).toBe(
      'Selecciona un libro, indica la fecha y escribe el nombre de quien lo recibe.'
    );
  });

  it('envía el nombre del lector y cierra el formulario tras confirmar', () => {
    const component = TestBed.createComponent(BooksComponent).componentInstance;
    component.availableBooksForLoan.set([book]);
    component.loanDraft = {
      bookId: book._id ?? '',
      userName: '  Ana Pérez  ',
      loanDate: '2026-03-15',
    };
    component.dialog.set('loan');

    component.saveLoan();

    expect(loansService.createLoan).toHaveBeenCalledWith({
      bookId: 'book-1',
      userName: 'Ana Pérez',
      loanDate: '2026-03-15',
    });
    expect(component.dialog()).toBeNull();
    expect(component.feedback()?.text).toBe('Préstamo registrado.');
  });

  it('muestra dentro del formulario el error que responde la API', () => {
    const component = TestBed.createComponent(BooksComponent).componentInstance;
    component.availableBooksForLoan.set([book]);
    component.loanDraft = {
      bookId: book._id ?? '',
      userName: 'Ana Pérez',
      loanDate: '2026-03-15',
    };
    component.dialog.set('loan');
    loansService.createLoan.mockImplementation(() =>
      throwError(() => new HttpErrorResponse({
        status: 409,
        error: { message: 'El libro no está disponible para préstamo' },
      }))
    );

    component.saveLoan();

    expect(component.dialog()).toBe('loan');
    expect(component.isSaving()).toBe(false);
    expect(component.loanError()).toBe('El libro no está disponible para préstamo');
  });

  it('muestra la etiqueta completa del año de publicación', () => {
    const publicationLabel = '1605 (1.ª parte) / 1615 (2.ª parte)';
    booksService.getBooks.mockReturnValue(
      of({
        ...bookPage,
        data: [{ ...book, year: 1605, publicationLabel }],
      })
    );
    const fixture = TestBed.createComponent(BooksComponent);

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(publicationLabel);
  });
});
