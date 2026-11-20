import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Loan, LoanDTO, PaginatedResponse } from '../book/model/books.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class LoansService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/loans`;

  // Recupera el historial paginado de préstamos, activos y devueltos.
  getLoans(page = 1, limit = 100): Observable<PaginatedResponse<Loan>> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<PaginatedResponse<Loan>>(this.url, { params });
  }

  // Consulta el total de préstamos pendientes para las tarjetas del panel.
  getActiveLoans(page = 1, limit = 100): Observable<PaginatedResponse<Loan>> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<PaginatedResponse<Loan>>(`${this.url}/active`, { params });
  }

  // Registra un préstamo; la API también marca el libro como no disponible.
  createLoan(loan: LoanDTO): Observable<Loan> {
    return this.http.post<Loan>(this.url, loan);
  }

  // Registra la devolución y devuelve el libro al inventario disponible.
  returnLoan(id: string): Observable<Loan> {
    return this.http.put<Loan>(`${this.url}/${id}`, { returned: true });
  }
}
