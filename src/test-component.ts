import {ComponentFixture, TestBed} from "@angular/core/testing"
import {Type} from "@angular/core"
import {concat} from "lodash"
import {selectComponent, selectComponents} from "./dom"
import {mockComponent, MockSetup} from "./mock-component"
import {selectorOf} from "./selector-of"
import {default as createTestHostComponent, MockTypeAndSetup, OutputWatch} from "./test-host"

let _subject: any = null
let _subjectElement: Element
let _fixture: ComponentFixture<any>

export const element = (selector: string): Element | null => subjectElement().querySelector(selector)
export const elements = (selector: string): NodeListOf<Element> => subjectElement().querySelectorAll(selector)
export const child = <T>(selectorOrType: string | Type<T>): T => selectComponent(selectorOrType, _fixture)
export const children = <T>(selectorOrType: string | Type<T>): T[] => selectComponents(selectorOrType, _fixture)
export const detectChanges = (): void => _fixture.detectChanges()
export const teardown = (): void => { TestBed.resetTestingModule() }

export const subject = <T>(): T => _subject
export const subjectElement = (): Element => _subjectElement
export const fixture = (): ComponentFixture<any> => _fixture

export const testComponent = <T>(subject: Type<T>) => new TestBuilder(subject)

export class TestBuilder<T> {
    private _providers: any[] = []
    private _use: Type<any>[] = []
    private _mock: Type<any>[] = []

    private mockSetups: {type: Type<any>, setup: MockSetup}[] = []
    private inputInitializations = new Map<string, any>()
    private outputWatches: OutputWatch[] = []

    constructor(private subject: Type<T>) {}

    public setupMock(type: Type<any>, setup: (mock: any) => void): TestBuilder<T> {
        this.mockSetups.push({type, setup})
        return this
    }

    public setInput(inputName: string, value: any): TestBuilder<T> {
        this.inputInitializations.set(inputName, value)
        return this
    }

    public onOutput(outputName: string, action: (event: any) => void): TestBuilder<T> {
        this.outputWatches.push({ name: outputName, action })
        return this
    }

    public mock(components: Type<any>[]) {
        this._mock = components
        return this
    }

    public use(components: Type<any>[]) {
        this._use = components
        return this
    }

    public providers(providers: any[]) {
        this._providers = providers
        return this
    }

    public begin(): T {
        const mockComponents = this._mock.map(type => createComponentMock(type, this.mockSetups))
        const TestHostComponent = createTestHostComponent(this.subject, this.inputInitializations, this.outputWatches)

        TestBed.configureTestingModule({
            declarations: concat(TestHostComponent, this.subject, mockComponents, this._use),
            providers: this._providers,
        })

        _fixture = TestBed.createComponent(TestHostComponent)
        _fixture.detectChanges()
        _subject = child(this.subject)

        _subjectElement = _fixture.nativeElement.querySelector(selectorOf(this.subject))
        return _subject as T
    }

}

function createComponentMock<T>(type: Type<T>, setup: MockTypeAndSetup[]): Type<T> {
    const relevantMockSetups = setup
        .filter(set => set.type === type)
        .map(set => set.setup)

    return mockComponent(type,  mock => applyMockSetups(mock, relevantMockSetups))
}

function applyMockSetups(mock: any, mockSetups: MockSetup[]): void {
    mockSetups.forEach(setup => setup(mock))
}
