import Wrapper from './src/modules/wrapper';

const wrapper = new Wrapper({
    databaseName: 'demo'
});
wrapper.syncData()
    .then(() => {
        const result = wrapper.find('complex', {}, null);
    })
    