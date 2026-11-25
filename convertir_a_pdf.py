import sys
try:
    from markdown_pdf import MarkdownPdf, Section
except ImportError:
    print("Error: Falta la librería 'markdown-pdf'.")
    print("Por favor, instálala ejecutando: pip install markdown-pdf")
    sys.exit(1)

def convert_md_to_pdf(input_file, output_file):
    try:
        # Leer el contenido del archivo Markdown
        with open(input_file, "r", encoding="utf-8") as f:
            md_content = f.read()
        
        # Inicializar el creador de PDF
        pdf = MarkdownPdf(toc_level=2)
        
        # Añadir el contenido como una sección
        pdf.add_section(Section(md_content))
        
        # Guardar el PDF
        pdf.save(output_file)
        print(f"✅ ¡Éxito! El archivo se ha convertido correctamente y guardado como: {output_file}")
        
    except FileNotFoundError:
        print(f"❌ Error: No se encontró el archivo '{input_file}'.")
    except Exception as e:
        print(f"❌ Ocurrió un error inesperado: {e}")

if __name__ == "__main__":
    archivo_entrada = "ruta_de_accion.md"
    archivo_salida = "ruta_de_accion.pdf"
    
    print(f"Iniciando conversión de {archivo_entrada} a {archivo_salida}...")
    convert_md_to_pdf(archivo_entrada, archivo_salida)
