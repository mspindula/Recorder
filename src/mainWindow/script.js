document.addEventListener('DOMContentLoaded', () => {
    const { ipcRenderer } = require("electron")
    const display = document.querySelector("#display")
    const record = document.querySelector("#record")
    const micInput = document.querySelector("#mic")

    let isRecording = false
    let selectedDeviceId = null
    let mediaRecorder = null
    let startTime = null
    let chunks = []

    navigator.mediaDevices.enumerateDevices().then(devices => {

        devices.forEach(device => {

            if (device.kind === "audioinput") {

                if (!selectedDeviceId) {
                    selectedDeviceId = device.deviceId
                }

                const option = document.createElement("option")

                option.value = device.deviceId
                option.text = device.label || "Microfone"

                micInput.appendChild(option)
            }
        })

        micInput.addEventListener("change", event => {
            selectedDeviceId = event.target.value
        })

        record.addEventListener("click", () => {

            isRecording = !isRecording

            updateButtonTo(isRecording)

            handleRecord(isRecording)
        })
    })

    function handleRecord(recording) {

        // =========================
        // INICIAR GRAVAÇÃO
        // =========================

        if (recording) {

            navigator.mediaDevices.getUserMedia({
                audio: {
                    deviceId: selectedDeviceId
                },
                video: false
            })
            .then(stream => {

                mediaRecorder = new MediaRecorder(stream)

                chunks = []

                // Evento dos dados do áudio
                mediaRecorder.ondataavailable = event => {

                    if (event.data.size > 0) {
                        chunks.push(event.data)
                    }
                }

                // Evento ao parar
                mediaRecorder.onstop = () => {

                    saveData()

                    stream.getTracks().forEach(track => {
                        track.stop()
                    })

                    mediaRecorder = null
                }

                // Começa o cronômetro
                startTime = Date.now()

                updateDisplay()

                // Começa a gravação
                mediaRecorder.start()

            })
            .catch(error => {

                console.error("Erro ao acessar microfone:", error)

                isRecording = false

                updateButtonTo(false)
            })

        }

        // =========================
        // PARAR GRAVAÇÃO
        // =========================

        else {

            if (
                mediaRecorder &&
                mediaRecorder.state !== "inactive"
            ) {

                mediaRecorder.stop()

            }

        }
    }

    function saveData() {

        const blob = new Blob(chunks, {
            type: "audio/webm; codecs=opus"})

            blob.arrayBuffer().then(blobBuffer => {
                const buffer = Buffer.from(blobBuffer, "binary")
                ipcRenderer.send("save_buffer", buffer)
            })
        



        // Para reproduzir:
        // document.querySelector("#audio").src =
        //     URL.createObjectURL(blob)

        chunks = []
    }

    function updateDisplay() {

        display.innerHTML = durationToTimestamp(
            Date.now() - startTime
        )

        if (isRecording) {

            window.requestAnimationFrame(updateDisplay)

        }
    }

    function durationToTimestamp(duration) {

        let mili = parseInt(
            (duration % 1000) / 100
        )

        let seconds = Math.floor(
            (duration / 1000) % 60
        )

        let minutes = Math.floor(
            (duration / 1000 / 60) % 60
        )

        let hours = Math.floor(
            duration / 1000 / 60 / 60
        )

        seconds = seconds < 10
            ? "0" + seconds
            : seconds

        minutes = minutes < 10
            ? "0" + minutes
            : minutes

        hours = hours < 10
            ? "0" + hours
            : hours

        return `${hours}:${minutes}:${seconds}.${mili}`
    }

    function updateButtonTo(recording) {

        if (recording) {

            record.classList.add("recording")

        } else {

            record.classList.remove("recording")

        }
    }

})

window.onload = () => {
    document.body.classList.remove("preload")
}