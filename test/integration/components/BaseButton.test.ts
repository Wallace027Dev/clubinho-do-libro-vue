import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import BaseButton from '../../../src/components/ui/BaseButton.vue'

describe('BaseButton', () => {
  it('aplica a variante como classe e renderiza o slot', () => {
    const wrapper = mount(BaseButton, { props: { variant: 'outline' }, slots: { default: 'Salvar' } })
    expect(wrapper.classes()).toContain('base-button--outline')
    expect(wrapper.text()).toContain('Salvar')
  })

  it('usa a variante primary por padrão', () => {
    const wrapper = mount(BaseButton)
    expect(wrapper.classes()).toContain('base-button--primary')
  })

  it('em loading fica desabilitado, marca aria-busy e mostra o spinner', () => {
    const wrapper = mount(BaseButton, { props: { loading: true } })
    expect(wrapper.attributes('disabled')).toBeDefined()
    expect(wrapper.attributes('aria-busy')).toBe('true')
    expect(wrapper.find('.base-button__spinner').exists()).toBe(true)
  })

  it('respeita a prop disabled', () => {
    const wrapper = mount(BaseButton, { props: { disabled: true } })
    expect(wrapper.attributes('disabled')).toBeDefined()
  })
})
