/** @format */

import hina from "./pv-sdk"
import epm from "./epm-sdk"

const dva = {
	init(config) {
		const {
            name,
			serverUrl,
			showLog,
			autoTrackConfig,
			preformanceErrorConfig,
			globalCallback,
			dataSendTimeout,
			isSinglePage,
		} = config
		if (autoTrackConfig) {
			hina.init({
				...config,
			})
		}
		if (preformanceErrorConfig) {
			epm.init({
                name,
				isSinglePage,
				serverUrl: preformanceErrorConfig?.serverUrl
					? preformanceErrorConfig.serverUrl
					: serverUrl,
				showLog,
				autoTrackConfig,
				globalCallback,
				dataSendTimeout,
				...preformanceErrorConfig,
			})
		}
	},
}

const sdk = new Proxy(dva, {
	get(target, prop) {
		if (prop !== "init") {
			if (hina.initialized) {
				return hina[prop]
			} else if (epm.initialized && epm[prop]) {
				return epm[prop]
			} else { 
				console.log("sdk not yet initialized!")
				return () => {}
			}
		} else {
			return target[prop]
		}
	},
})

export default sdk
