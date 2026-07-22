import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import RatingInput from '../../../src/components/ui/RatingInput.vue'

describe('RatingInput', () => {
  it('emite update:modelValue ao mexer no range', async () => {
    const wrapper = mount(RatingInput, { props: { modelValue: 0 } })
    await wrapper.find('input[type="range"]').setValue('4.5')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([4.5])
  })

  it('mostra o rótulo formatado em pt-BR quando há nota', () => {
    const wrapper = mount(RatingInput, { props: { modelValue: 4.5 } })
    expect(wrapper.text()).toContain('4,5/5')
  })

  it('mostra a dica quando a nota é 0', () => {
    const wrapper = mount(RatingInput, {
      props: { modelValue: 0, emptyHint: 'Toque nas estrelas' }
    })
    expect(wrapper.text()).toContain('Toque nas estrelas')
  })
})
