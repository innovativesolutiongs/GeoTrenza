import { Link } from "react-router-dom"

const CommingSoon = () => {
    return <div className="wrapper">
    <div className="error-404 d-flex align-items-center justify-content-center">
        <div className="card shadow-none bg-transparent">
            <div className="card-body text-center">
                <h1 className="display-4 mt-5">We are Coming  as Soon!</h1>
                <p>We are currently working hard on this page. Subscribe our newsletter
                    <br/>to get update when it'll be live.</p>
                <div className="row">
                    <div className="col-12 col-lg-12 mx-auto">
                        <h4 className="mt-3">Follow Us :</h4>
                        <div className="error-social mt-3"> <Link to='#' className="bg-facebook"><i className='bx bxl-facebook'></i></Link>
                            <Link to='#' className="bg-twitter"><i className='bx bxl-twitter'></i></Link>
                            <Link to='#' className="bg-google"><i className='bx bxl-google'></i></Link>
                            <Link to='#' className="bg-linkedin"><i className='bx bxl-linkedin'></i></Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <div className="bg-white p-3 fixed-bottom border-top shadow">
        <div className="d-flex align-items-center justify-content-between flex-wrap">
            <ul className="list-inline mb-0">
                <li className="list-inline-item">Follow Us :</li>
                <li className="list-inline-item"><Link to='#'><i className='bx bxl-facebook me-1'></i>Facebook</Link>
                </li>
                <li className="list-inline-item"><Link to='#'><i className='bx bxl-twitter me-1'></i>Twitter</Link>
                </li>
                <li className="list-inline-item"><Link to='#'><i className='bx bxl-google me-1'></i>Google</Link>
                </li>
            </ul>
            <p className="mb-0">Copyright © 2020. All rights reserved.</p>
        </div>
    </div>
</div>
}

export default CommingSoon