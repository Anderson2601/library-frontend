// Representa los campos que devuelve la colección de libros de la API.
export interface Book {
  _id?: string;
  title: string;
  isbn: string;
  authorId: string;
  year?: number;
  publicationLabel?: string;
  available: boolean;
  createdAt: string;
  updatedAt: string;
}

// Describe el cuerpo aceptado al crear o editar un libro.
export interface BookDTO {
  title: string;
  isbn: string;
  authorId: string;
  year?: number;
  publicationLabel?: string;
  available?: boolean;
}

// Representa un autor existente para relacionarlo con sus libros.
export interface Author {
  _id?: string;
  name: string;
  nationality: string;
  birthYear?: number;
  createdAt?: string;
  updatedAt?: string;
}

// Contiene los datos que la API requiere para registrar un autor.
export interface AuthorDTO {
  name: string;
  nationality: string;
  birthYear?: number;
}

// Representa un préstamo y su estado de devolución.
export interface Loan {
  _id?: string;
  bookId: string;
  userName: string;
  loanDate: string;
  returnDate?: string;
  returned: boolean;
  createdAt: string;
  updatedAt: string;
}

// Define los datos requeridos para registrar un préstamo.
export interface LoanDTO {
  bookId: string;
  userName: string;
  loanDate: string;
}

// Estructura común que devuelve la API en sus listados paginados.
export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}