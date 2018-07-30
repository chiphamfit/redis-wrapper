import Wrapper from './src/modules/wrapper';

const wrapper = new Wrapper({
    databaseName: 'demo'
});
wrapper.syncData()
    .then(() => {
        wrapper.find('car', {}, {});
    })
    .catch((err) => {
        console.log(err);
    })