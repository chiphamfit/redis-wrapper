import Wrapper from './src/modules/wrapper';

const wrapper = new Wrapper({
    databaseName: 'demo'
});
wrapper.syncData()
    .then(() => {
        wrapper.find('car', {}, {}).then((result) => {
            console.log(result);
        })
    })
    .catch((err) => {
        console.log(err);
    })