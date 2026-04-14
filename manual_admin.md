# Manual de Usuario - Administrador (Fundación Carlos Stohr)

Bienvenido al sistema de calificación de concursos de la Fundación Carlos Stohr.
Como administrador, usted es el encargado de gestionar los concursos, los jueces, las obras participantes y de obtener los resultados finales. Esta aplicación ha sido diseñada específicamente para automatizar la puntuación y evitar empates en los primeros lugares.

Este manual le guiará paso a paso en todas las funciones. Tenga en cuenta que **no requiere conocimientos de programación**; todo se maneja a través de la interfaz visual de la web.

## 1. Inicio de Sesión
1. Ingrese a la dirección web de la aplicación proporcionada por el desarrollador.
2. Inicie sesión con sus credenciales usuario: admin y contraseña: [adminpassword123] de administrador.
3. Una vez dentro, visualizará un menú de navegación superior con las siguientes opciones:
   - Panel / Dashboard
   - Obras
   - Jueces
   - Resultados
   - Concursos

## 2. Jueces y Credenciales
El sistema cuenta con un conjunto de jueces preestablecidos.
1. Navegue a la sección **Jueces** si desea consultar la lista de jueces o identificarlos.
2. Las credenciales de acceso para cada juez ya han sido configuradas previamente por el equipo técnico. 
Credenciales de los jueces: 
Usuario: [juez1] Contraseña: [juezpass12026]
Usuario: [juez2] Contraseña: [juezpass22026]
Usuario: [juez3] Contraseña: [juezpass32026]
Usuario: [juez4] Contraseña: [juezpass42026]
Usuario: [juez5] Contraseña: [juezpass52026]
3. **Entregue estas credenciales** al juez correspondiente. El juez utilizará ese usuario y contraseña exclusivamente para entrar a calificar en el sistema.

## 3. Subida y Gestión de Obras (FORMATO ESTRICTO)
Para que un concurso pueda ser evaluado, es obligatorio registrar sus obras. Todas las obras quedarán agrupadas bajo el nombre del Concurso.

1. Vaya a la sección **Obras**.
2. **Opción A: Agregar individualmente (Para pocas obras)**
   - Llene el formulario de la sección "Agregar Obra" con los datos: Título, Autor, Categoría (Infantil, Juvenil, Adulto), el Nombre del Concurso y la Descripción.
   - Haga clic en "Agregar Obra".

3. **Opción B: Importar desde Excel o CSV (Recomendado)**
   Si tiene decenas de obras, puede subir un archivo Excel (`.xlsx`) o CSV.
   - En la sección "Importar desde Excel / CSV", escriba primero el **Nombre del Concurso** a asignar.
   - Haga clic o arrastre su documento en el área marcada.

   **⚠️ FORMATO PERMITIDO PARA EL ARCHIVO EXCEL/CSV:**
   Debe asegurar que las columnas en su Excel sigan estrictamente el siguiente orden (una obra por cada fila):
   * **Columna A (Número / `#`):** Debe incluir el número de participante y la primera letra indicará la Categoría de la obra.
     - Letra **I** para Infantil (Ejemplo: `I-001`, `I102`)
     - Letra **J** para Juvenil (Ejemplo: `J-015`, `J55`)
     - Letra **A** para Adulto (Ejemplo: `A-123`, `A02`)
     *(El sistema detecta automáticamente la categoría leyendo esa primera letra).*
   * **Columna B (Título):** Nombre de la obra.
   * **Columna C (Autor):** Nombre del artista o participante.
   * **Columna D (Descripción - opcional):** Texto descriptivo breve.


## 4. Resultados y Finalización del Concurso
El sistema calculará las puntuaciones a medida que los jueces califican, garantizando un Top 5 sin empates.
1. Navegue a la sección **Resultados**. Aquí podrá ver el progreso y los puntajes.
2. Una vez que confirme que **todas las obras han sido calificadas por los jueces**, el concurso habrá concluido.
3. El sistema generará el Veredicto final del concurso con los resultados consolidados de los ganadores.
4. **Nota importante sobre limpieza de datos:** Tras generar el veredicto definitivo de un concurso, las obras individuales de ese grupo se eliminarán de la base de datos temporal, y sólo se conservará permanentemente el registro de los Resultados (Veredicto). Esto mantiene el sistema rápido, ordenado y preparado para un nuevo concurso.

## 5. Salir del Sistema
En todo momento, para cuidar la seguridad, puede utilizar el botón **"Cerrar Sesión"** ubicado en el menú superior o lateral de la aplicación.
