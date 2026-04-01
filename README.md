# Handpose Mario

![Demo](assets/Grabación%202026-03-31%20215720.gif)

Proyecto de control gestual para `Super Mario Bros. 3` usando webcam y un modelo entrenado con gestos de mano.

La versión activa del juego está en [`mario/`](/home/chop/Documents/handpose-mario/mario) y corre sobre un emulador NES en el navegador.

## Requisitos

- `python3` (para módulo http.server) o `Node.js` (para npx serve)
- Un navegador moderno
- Cámara web habilitada

## Cómo levantar el proyecto

Desde la raíz del proyecto, puedes ejecutar usando Python:

```bash
python3 -m http.server 8000
```

O bien, si usas Node.js, simplemente puedes correr:

```bash
npx serve
```

Luego abrir en el navegador:

```text
http://localhost:8000/mario/
```

También se puede abrir:

```text
http://localhost:8000/
```

La raíz redirige automáticamente a `mario/`.

## Controles por gestos

Los controles fueron entrenados con la mano derecha.

Condiciones importantes para que funcionen bien:

- usar siempre la mano derecha
- mostrar la palma apuntando hacia la cámara
- mantener buena iluminación
- evitar fondos muy cargados
- intentar repetir los gestos con una distancia parecida a la usada en el entrenamiento

Mapa de controles (Modelo Nahuel):

- `Izquierda` `✌️`: mueve a Mario hacia la izquierda
- `Derecha` `☝️`: mueve a Mario hacia la derecha
- `Arriba` `🤚`: hace saltar a Mario
- `Abajo` `✊`: hace que Mario se agache
- `Nada`: sin acción, suelta los controles del modelo

Mapa de controles (Modelo Seba):

- `Izquierda` `👈`: mueve a Mario hacia la izquierda
- `Derecha` `🖐️`: mueve a Mario hacia la derecha
- `Arriba (Saltar)` `☝️`: hace saltar a Mario
- `Abajo` `✊`: hace que Mario se agache
- `Nada`: sin acción, suelta los controles del modelo

## Notas de uso

- Al entrar, el navegador pedirá permiso para usar la cámara.
- El audio del juego puede activarse después de hacer click en la página.
- El panel lateral muestra:
  - la cámara
  - el estado del modelo
  - la clase detectada
  - la acción efectiva aplicada al juego
  - el ranking de predicciones

## Estructura principal

- [`mario/index.html`](/home/chop/Documents/handpose-mario/mario/index.html): interfaz del juego
- [`mario/main.js`](/home/chop/Documents/handpose-mario/mario/main.js): emulador, webcam, predicción y mapeo de controles
- [`mario/model/`](/home/chop/Documents/handpose-mario/mario/model): modelo exportado de gestos
- [`mario/smb3.nes`](/home/chop/Documents/handpose-mario/mario/smb3.nes): ROM usada por el emulador

## Solución de problemas

- Si la cámara detecta gestos pero Mario no responde, revisar el panel de estado a la derecha.
- Si el navegador sigue mostrando una versión antigua, hacer recarga forzada:
  - Windows/Linux: `Ctrl + Shift + R`
  - Mac: `Cmd + Shift + R`
- No abrir el proyecto como `file://...`; debe correrse con servidor local para que cargue correctamente la ROM y el modelo.
