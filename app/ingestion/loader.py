from unstructured.partition.auto import partition

def load_document(path):
    elements = partition(filename=path)
    return "\n".join(el.text for el in elements if el.text)