import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AppSpinner from '../../../src/components/ui/AppSpinner.vue'
import SkeletonBlock from '../../../src/components/ui/SkeletonBlock.vue'

describe('SkeletonBlock', () => {
  it('aplica as dimensões passadas', () => {
    const wrapper = mount(SkeletonBlock, { props: { width: '5rem', height: '2rem' } })
    const el = wrapper.find('.skeleton')
    expect(el.exists()).toBe(true)
    expect(el.attributes('style')).toContain('width: 5rem')
    expect(el.attributes('style')).toContain('height: 2rem')
  })
})

describe('AppSpinner', () => {
  it('expõe status acessível para leitores de tela', () => {
    const wrapper = mount(AppSpinner, { props: { label: 'Carregando' } })
    const el = wrapper.find('.spinner')
    expect(el.attributes('role')).toBe('status')
    expect(el.attributes('aria-label')).toBe('Carregando')
  })
})
