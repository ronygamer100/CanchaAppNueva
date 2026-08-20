from urllib.parse import quote


def wa_me_link(phone: str, message: str) -> str:
    """Construye un link wa.me con mensaje pre-llenado. phone en E.164 sin '+'."""
    clean = phone.lstrip("+").replace(" ", "")
    return f"https://wa.me/{clean}?text={quote(message)}"


def build_confirmation_message(
    nombre_negocio: str, fecha: str, hora: str
) -> str:
    return (
        f"¡Hola! Tu reserva en {nombre_negocio} para el {fecha} "
        f"a las {hora} fue *confirmada*. ¡Te esperamos!"
    )


def build_rejection_message(
    nombre_negocio: str, fecha: str, hora: str, motivo: str = ""
) -> str:
    base = (
        f"Hola, lamentablemente tu reserva en {nombre_negocio} para el {fecha} "
        f"a las {hora} no se pudo confirmar."
    )
    if motivo:
        base += f" Motivo: {motivo}"
    base += " Coordinaremos contigo la devolución del pago. Disculpa."
    return base


def build_owner_cancel_message(
    nombre_negocio: str, fecha: str, hora: str, motivo: str = ""
) -> str:
    """El dueño cancela una reserva ya confirmada."""
    base = (
        f"Hola, tenemos que cancelar tu reserva en {nombre_negocio} para el {fecha} "
        f"a las {hora}."
    )
    if motivo:
        base += f" Motivo: {motivo}"
    base += " Te devolveremos el pago íntegramente. Lamentamos los inconvenientes."
    return base
