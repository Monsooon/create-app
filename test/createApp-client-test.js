import expect from 'expect'
import execSteps from './execSteps'
import createApp from '../src/client'
import { getController, Home, List, Detail, NotFound } from './classes'

let app

describe('createApp-client', () => {

    describe('result', () => {
        it('should return an object', () => {
            let app = createApp({
                routes: [],
            })
            expect(app).toBeA('object')
            expect(app.start).toBeA('function')
            expect(app.stop).toBeA('function')
            expect(app.history).toBeA('object')
            expect(app.render).toBeA('function')
        })
    })

    describe('feature: hash history', () => {
        describeTest('createHashHistory')
    })

    describe('feature: pushState history', () => {
        describeTest('createHistory')
    })
})


function describeTest(type) {
    let initApp = (settings) => {
        // clear app and document.body
        if (app) {
            app.stop()
            document.body.innerHTML = ''
            window.location.hash = ''
        }

        app = createApp({
            container: 'body',
            ...settings,
            type,
        })
        return new Promise(resolve => {
            // do not match current location
            app.start(resolve, false)
            let targetPath = `/random${Math.random().toString(36).substr(2)}`
                // render random location by default
            app.history.push(targetPath)
        })
    }

    describe('works without loader', () => {
        beforeEach(() => {
            let routes = [{
                path: '/(home|debug.html)?',
                controller: () => Home,
            }, {
                path: '/list',
                controller: () => List,
            }, {
                path: '/detail',
                controller: () => Detail,
            }, {
                path: '*',
                controller: () => NotFound,
            }]

            return initApp({
                routes,
            })
        })
        createTest()
    })

    describe('works with loader', () => {
        let routes = [{
            path: '/(home|debug.html)?',
            controller: 'home',
        }, {
            path: '/list',
            controller: 'list',
        }, {
            path: '/detail',
            controller: 'detail',
        }, {
            path: '*',
            controller: '*',
        }]

        describe('callback style at sync mode', () => {
            beforeEach(() => {
                let loader = (controller) => {
                    let Controller
                    switch (controller) {
                        case 'home':
                            Controller = Home
                            break
                        case 'list':
                            Controller = List
                            break
                        case 'detail':
                            Controller = Detail
                            break
                        default:
                            Controller = NotFound
                    }
                    return Controller
                }
                return initApp({
                    routes,
                    loader,
                })
            })
            createTest()
        })

        describe('callback style at async mode', () => {
            beforeEach(() => {
                let loader = (controller) => {
                    let Controller
                    switch (controller) {
                        case 'home':
                            Controller = Home
                            break
                        case 'list':
                            Controller = List
                            break
                        case 'detail':
                            Controller = Detail
                            break
                        default:
                            Controller = NotFound
                    }

                    return new Promise((resolve) => {
                        setTimeout(() => {
                            resolve(Controller)
                        }, 10)
                    })
                }
                return initApp({
                    routes,
                    loader,
                })
            })
            createTest()
        })
    })
}

function createTest() {

    it('should get container by controller.getContainer', () => {
        let container = getController().getContainer()
        expect(container).toBe(document.querySelector('body'))
    })

    it('should match browser location and render page', (done) => {
        let steps = [
            location => {
                let content = document.body.innerHTML
                expect(content).toEqual('home')
                expect(location.pathname).toEqual('/')
                done()
            }
        ]
        execSteps(steps, app.subscribe, done)
        app.history.push('/')
    })

    it('should refresh view when calling container.refreshView', (done) => {
        let steps = [
            location => {
                let content = document.body.innerHTML
                expect(content).toEqual('home')

                document.body.innerHTML = ''

                content = document.body.innerHTML
                expect(content).toEqual('')

                getController().refreshView()
                content = document.body.innerHTML
                expect(content).toEqual('home')
                expect(location.pathname).toEqual('/')
            }
        ]
        execSteps(steps, app.subscribe, done)
        app.history.push('/')
    })

    it('should go to another location and render page', (done) => {
        let steps = [
            location => {
                let content = document.body.innerHTML
                expect(content).toEqual('home')
                expect(location.pathname).toEqual('/')
                app.history.push('/detail')
            },
            location => {
                let content = document.body.innerHTML
                expect(content).toEqual('detail')
                expect(location.pathname).toEqual('/detail')
                done()
            }
        ]
        execSteps(steps, app.subscribe, done)
        app.history.push('/')
    })

    it('should wait for promise resolved when controller.init return promise', (done) => {
        let start
        let steps = [
            location => {
                let content = document.body.innerHTML
                expect(content).toEqual('home')
                expect(location.pathname).toEqual('/')
                start = new Date()
                app.history.push('/list')
            },
            location => {
                let content = document.body.innerHTML
                expect(location.pathname).toEqual('/list')
                expect(new Date() - start >= 50).toBe(true)
                expect(content).toEqual('list')
                done()
            }
        ]
        execSteps(steps, app.subscribe, done)
        app.history.push('/')
    })

    it('should go to another location when calling controller#goX method', (done) => {
        let steps = [
            location => {
                let content = document.body.innerHTML
                expect(content).toEqual('home')
                expect(location.pathname).toEqual('/')
                getController().goTo('/detail')
            },
            location => {
                let content = document.body.innerHTML
                expect(content).toEqual('detail')
                expect(location.pathname).toEqual('/detail')
                getController().goReplace('/notfound')
            },
            location => {
                let content = document.body.innerHTML
                expect(content).toEqual('not found')
                expect(location.pathname).toEqual('/notfound')
                done()
            }
        ]
        execSteps(steps, app.subscribe, done)
        app.history.push('/')
    })

    it('should call controller.destroy when go to another location', () => {
        let count = 0
        getController().destroy = function() {
            count += 1
            expect(count).toBe(1)
        }
        getController().goTo('/detail')
    })
}