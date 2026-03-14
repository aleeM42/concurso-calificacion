---
trigger: always_on
---

1. Arquitectura MVC 
2. No usamos frameworks, solo css, javascript y html
3. Aplicación web MVC para gestionar concursos donde jueces califican obras y un administrador gestiona obras, jueces y resultados (top 5).
4. El administrador del concurso (cliente) NO es técnico. El desarrollador configura todo (Firebase, despliegue, cuenta admin). El admin solo recibe sus credenciales de login y opera desde la interfaz web. Nunca toca código, consola ni archivos de configuración.
5. El próposito de la aplicación es automatizar la puntuación final de los ganadores del concurso, evitando empates en el primer lugar.
6. Las obras se van a guardar por concurso, cuando todas las obras de un concurso estén calificadas estas se borran y se guarda el veredicto (resultados del concurso)