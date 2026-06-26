import { useCallback, useEffect, useRef, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useKeepAwake } from 'expo-keep-awake'
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio'

const MUDO_KEY = 'cozinha_som_mudo'

// Alerta sonoro nativo da cozinha (porta do useCozinhaAlerta web):
//  - som: chime de 2 notas via expo-audio (toca MESMO no silencioso — essencial);
//  - keep-awake: a tela não dorme enquanto a cozinha está montada;
//  - mudo: persistido em AsyncStorage.
// Diferente da web, o RN não exige gesto p/ liberar o áudio (sem passo "armar").
// (Som com o app em background real depende de PUSH — fora do escopo "backend não muda".)
export function useCozinhaAlerta() {
  useKeepAwake()
  const player = useAudioPlayer(require('../../../assets/sounds/chime.wav'))
  const [mudo, setMudo] = useState(false)
  const mudoRef = useRef(false)

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {})
    AsyncStorage.getItem(MUDO_KEY)
      .then((v) => {
        if (v === '1') {
          setMudo(true)
          mudoRef.current = true
        }
      })
      .catch(() => {})
  }, [])

  const alternarMudo = useCallback(() => {
    setMudo((m) => {
      const novo = !m
      mudoRef.current = novo
      AsyncStorage.setItem(MUDO_KEY, novo ? '1' : '0').catch(() => {})
      return novo
    })
  }, [])

  const tocar = useCallback(() => {
    if (mudoRef.current) return
    try {
      player.seekTo(0)
      player.play()
    } catch {
      /* degrada sem quebrar */
    }
  }, [player])

  return { mudo, alternarMudo, tocar }
}
