import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Author, AuthorDTO, PaginatedResponse } from '../book/model/books.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthorsService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/authors`;

  // Obtiene autores para la pantalla de gestión y el selector de libros.
  getAuthors(page = 1, limit = 100): Observable<PaginatedResponse<Author>> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<PaginatedResponse<Author>>(this.url, { params });
  }

  // Crea un autor para que pueda asignarse a los libros del catálogo.
  createAuthor(author: AuthorDTO): Observable<Author> {
    return this.http.post<Author>(this.url, author);
  }

  // Actualiza la información de un autor seleccionado.
  updateAuthor(id: string, author: Partial<AuthorDTO>): Observable<Author> {
    return this.http.put<Author>(`${this.url}/${id}`, author);
  }

  // La API impide eliminar autores que todavía tengan libros asociados.
  deleteAuthor(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
