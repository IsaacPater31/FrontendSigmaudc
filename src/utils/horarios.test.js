// SIGMA-UDC — Sistema Integral de Gestión de Matrícula Académica
// Copyright (c) 2025 Andrés Javier Quintana Alape, Gustavo Calderón Kelsey,
// Isaac David Paternina Noble, Harry Perez Perea, Camilo Rodríguez Garay,
// José Félix Bustamante Soto y Juan Felipe Eraso Navarro.
// Todos los derechos reservados.

// Pruebas unitarias de las utilidades de cruce de horarios.
// Se ejecutan con el runner nativo de Node: npm test (node --test).
import test from 'node:test';
import assert from 'node:assert/strict';
import { haySolapamiento, horariosSeCruzan } from './horarios.js';

test('haySolapamiento detecta rangos que se cruzan', () => {
  assert.equal(haySolapamiento('08:00', '10:00', '09:00', '11:00'), true);
  assert.equal(haySolapamiento('08:00', '10:00', '08:00', '10:00'), true);
  assert.equal(haySolapamiento('08:00', '10:00', '09:30', '10:30'), true);
});

test('haySolapamiento no cruza rangos contiguos ni disjuntos', () => {
  assert.equal(haySolapamiento('08:00', '10:00', '10:00', '12:00'), false);
  assert.equal(haySolapamiento('08:00', '10:00', '06:00', '08:00'), false);
  assert.equal(haySolapamiento('08:00', '10:00', '10:30', '12:00'), false);
});

test('horariosSeCruzan exige mismo día y solapamiento', () => {
  const lunes8a10 = [{ dia: 'LUNES', hora_inicio: '08:00', hora_fin: '10:00' }];
  const lunes9a11 = [{ dia: 'LUNES', hora_inicio: '09:00', hora_fin: '11:00' }];
  const martes9a11 = [{ dia: 'MARTES', hora_inicio: '09:00', hora_fin: '11:00' }];

  assert.equal(horariosSeCruzan(lunes8a10, lunes9a11), true);
  assert.equal(horariosSeCruzan(lunes8a10, martes9a11), false);
  assert.equal(horariosSeCruzan([], lunes9a11), false);
  assert.equal(horariosSeCruzan(lunes8a10, []), false);
});
