import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import PasswordInput from '../../../src/components/ui/PasswordInput.vue'

describe('PasswordInput', () => {
  it('começa oculto (type=password) e o olho alterna para texto e volta', async () => {
    const wrapper = mount(PasswordInput, { props: { modelValue: 'segredo' } })
    expect(wrapper.find('input').attributes('type')).toBe('password')

    await wrapper.find('button.password-toggle').trigger('click')
    expect(wrapper.find('input').attributes('type')).toBe('text')

    await wrapper.find('button.password-toggle').trigger('click')
    expect(wrapper.find('input').attributes('type')).toBe('password')
  })

  it('emite update:modelValue ao digitar', async () => {
    const wrapper = mount(PasswordInput, { props: { modelValue: '' } })
    await wrapper.find('input').setValue('nova-senha')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['nova-senha'])
  })

  it('repassa atributos (autocomplete, required) ao input interno', () => {
    const wrapper = mount(PasswordInput, {
      props: { modelValue: '' },
      attrs: { autocomplete: 'current-password', required: true }
    })
    const input = wrapper.find('input')
    expect(input.attributes('autocomplete')).toBe('current-password')
    expect(input.attributes('required')).toBeDefined()
  })
})
