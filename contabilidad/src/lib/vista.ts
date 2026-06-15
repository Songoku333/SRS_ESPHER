import { useMemo } from 'react';
import { useAppData } from './store';
import { useAcceso, filtrarPorAlcance } from './acceso';

/** Datos de la app ya filtrados por el alcance del usuario en sesión. */
export function useDatosVisibles() {
  const data = useAppData();
  const acceso = useAcceso();
  return useMemo(() => filtrarPorAlcance(data, acceso), [data, acceso]);
}
